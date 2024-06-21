const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const crypto = require('crypto');

function noRebuildNeeded(src, dest) {
	try {
		const srcStat = fs.statSync(src, {throwIfNoEntry: false});
		if (!srcStat) return true;
		const destStat = fs.statSync(dest);
		if (srcStat.ctimeMs < destStat.ctimeMs) return true;
	} catch (e) {}

	return false;
}

/**
 * @param {string[]} dirs
 * @param {(path: string) => void} listener 
 */
function watch(dir, listener) {
	let chokidar;
	try {
		chokidar = require('chokidar');
	} catch (e) {
		throw new Error("You must have chokidar installed.");
	}

	const watcher = chokidar.watch(dir, {
		persistent: true,
		ignoreInitial: true,
		awaitWriteFinish: {
			stabilityThreshold: 50,
			pollInterval: 10,
		},
	});

	for (const type of ["add", "change"]) {
		watcher.on(type, listener);
	}
}

function compileToDir(srcDir, destDir, opts = {}) {
	let incremental = opts.incremental;

	const entryPoints = [];
	/** @type {Map<string, string[]>} Map<entryPoint, htmlFile> */
	const entryPointDependencies = new Map();
	function handle(src, dest) {
		const stat = fs.statSync(src, {throwIfNoEntry: false});
		if (!stat) return 0;

		if (stat.isDirectory()) {
			const files = fs.readdirSync(src);
			let total = 0;
			for (const file of files) {
				if (file.startsWith('.')) continue;
				total += handle(path.join(src, file), path.join(dest, file));
			}
			return total;
		} else {
			return handleFile(src, dest);
		}
	}

	function handleFile(src, dest = path.join(destDir, path.relative(srcDir, src))) {
		if (dest.endsWith('.html') || dest.endsWith('.html')) {
			return handleHTML(src, dest);
		}

		if (incremental && noRebuildNeeded(src, dest)) return 0;

		fs.mkdirSync(path.dirname(dest), {recursive: true});
		fs.copyFileSync(src, dest);
		fs.chmodSync(dest, fs.statSync(src).mode);
		return 1;
	}

	function getCachebuster(src) {
		try {
			const contents = fs.readFileSync(src);
			const hash = crypto.createHash('md5').update(contents).digest('hex');
			return '?' + hash.slice(0, 8);
		} catch {
			return '';
		}
	}

	function handleHTML(src, dest) {
		fs.mkdirSync(path.dirname(dest), {recursive: true});
		let contents = '' + fs.readFileSync(src);
		contents = contents.replace(/<script src="([^"]*.tsx?)">/i, (substring, ePath) => {
			let entryPoint;
			if (/^[A-Za-z0-9]*:/.test(ePath)) {
				throw new Error(`External path to "${ePath}" can't be compiled; please replace it with a relative path`);
			}
			if (ePath.startsWith('/')) {
				// absolute path; treat it as relative to `srcDir`
				entryPoint = ePath.slice(1);
			} else {
				// relative path
				entryPoint = path.relative(srcDir, path.join(path.dirname(src), ePath));
			}
			entryPoints.push(entryPoint);
			let deps = entryPointDependencies.get(entryPoint);
			if (!deps) {
				deps = [];
				entryPointDependencies.set(entryPoint, deps);
			}
			if (!deps.includes(src)) deps.push(src);
			const cachebuster = getCachebuster(path.join(path.dirname(dest), compiledEntryPoint(ePath)));
			return `<script src="${compiledEntryPoint(ePath) + cachebuster}">`;
		});

		try {
			const oldContents = '' + fs.readFileSync(dest);
			if (oldContents === contents) return 0;
		} catch {}
		console.log(`${src} -> ${dest}`);
		fs.writeFileSync(dest, contents);
		return 1;
	}

	function compiledEntryPoint(ePath) {
		const ePathNoExt = ePath.slice(0, ePath.endsWith('.tsx') ? -4 : -3);
		return ePathNoExt + '.js';
	}

	const results = handle(srcDir, destDir);

	const esbuilds = [];
	for (const entryPoint of entryPoints) {
		esbuilds.push(esbuild.build({
			entryPoints: [path.join(srcDir, entryPoint)],
			bundle: true,
			outfile: path.join(destDir, compiledEntryPoint(entryPoint)),
			watch: opts.watch ? {
				onRebuild: (error, result) => {
					console.log(`rebundled ${entryPoint}`);
					const deps = entryPointDependencies.get(entryPoint);
					for (const dep of deps) {
						handleFile(dep);
					}
				},
			} : false,
			format: 'iife',
			minify: true,
			target: 'es6',
			sourcemap: true,
		}));
	}

	Promise.all(esbuilds).then(() => {
		// cachebust compiled entry points
		const htmlEntryPoints = new Set();
		for (const points of entryPointDependencies.values()) {
			for (const point of points) {
				htmlEntryPoints.add(point);
			}
		}
		for (const point of htmlEntryPoints) {
			handleFile(point);
		}
		if (opts.watch) {
			incremental = false;
			watch(srcDir, filename => {
				handleFile(filename);
				console.log(`rebuilt ${filename}`);
			});
			console.log(`Watching ${srcDir} for changes...`);
		}
	});

	return results;
}

function compileSeparately(srcDir, destDir, opts = {}) {
	let incremental = opts.incremental;
	const entryPoints = [];
	function handle(src, dest) {
		const stat = fs.statSync(src, {throwIfNoEntry: false});
		if (!stat) return 0;

		if (stat.isDirectory()) {
			const files = fs.readdirSync(src);
			let total = 0;
			for (const file of files) {
				if (file.startsWith('.')) continue;
				total += handle(path.join(src, file), path.join(dest, file));
			}
			return total;
		} else {
			return handleFile(src, dest);
		}
	}

	function handleFile(src, dest = path.join(destDir, path.relative(srcDir, src))) {
		if (incremental && noRebuildNeeded(src, dest)) return 0;

		if (src.endsWith('.ts')) {
			handleTSFile(src, dest);
			return 0;
		}

		fs.mkdirSync(path.dirname(dest), {recursive: true});
		fs.copyFileSync(src, dest);
		fs.chmodSync(dest, fs.statSync(src).mode);
		return 1;
	}

	function handleTSFile(src, dest) {
		esbuild.buildSync({
			entryPoints: [src],
			outdir: destDir,
			outbase: srcDir,
			watch: false,
			format: 'cjs',
			minify: true,
			target: 'es6',
			sourcemap: true,
		});
	}

	const results = handle(srcDir, destDir);

	if (opts.watch) {
		incremental = false;
		watch(srcDir, filename => {
			handleFile(filename);
			console.log(`rebuilt ${filename}`);
		});
		console.log(`Watching ${srcDir} for changes...`);
	}

	return results;
}

exports.compileToDir = compileToDir;
exports.compileSeparately = compileSeparately;
