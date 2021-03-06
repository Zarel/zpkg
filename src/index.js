'use strict';

const fs = require('fs');
const compilerE = require('./compiler-esbuild');

/**
 * @typedef {object} CompileOpts
 * @property {boolean} [incremental]
 * @property {boolean} [watch]
 */

/**
 * @param {CompileOpts} opts
 */
function buildClient(opts = {}) {
	return compilerE.compileToDir(
		'client',
		'client-dist',
		opts
	);
}

/**
 * @param {CompileOpts} opts
 */
function buildServer(opts = {}) {
	const serverCompileOpts = {
		babelrc: false,
		ignore: ['tsconfig.json'],
		...opts,
	};
	return compilerE.compileSeparately(
		'server',
		'server-dist',
		serverCompileOpts
	);
}

/**
 * @param {CompileOpts} opts
 */
function buildSrc(opts = {}) {
	const serverCompileOpts = {
		babelrc: false,
		ignore: ['tsconfig.json'],
		...opts,
	};
	return compilerE.compileSeparately(
		'src',
		'dist',
		serverCompileOpts
	);
}

function build(opts) {
	let compiledFiles = 0;
	let anyFound = false;
	const compileStartTime = process.hrtime();

	if (fs.existsSync('client')) {
		process.stdout.write("Compiling client... ");

		compiledFiles += buildClient(opts);
		anyFound = true;
	}
	if (fs.existsSync('server')) {
		process.stdout.write("Compiling server... ");

		compiledFiles += buildServer(opts);
		anyFound = true;
	}
	if (fs.existsSync('src')) {
		process.stdout.write("Compiling src... ");

		compiledFiles += buildSrc(opts);
		anyFound = true;
	}
	if (!anyFound) {
		console.error("Your source files must be in a directory named client/, server/, or src/");
		return;
	}

	const diff = process.hrtime(compileStartTime);
	console.log("DONE");
	console.log(
		`(${compiledFiles} ${compiledFiles !== 1 ? "files" : "file"} in ${diff[0] + Math.round(diff[1] / 1e6) / 1e3}s)`
	);
}

exports.buildClient = buildClient;
exports.buildServer = buildServer;
exports.build = build;
