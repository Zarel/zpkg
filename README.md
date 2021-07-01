zpkg
====

`zpkg` is a system for making TypeScript web apps and Node.js server apps.



Using zpkg
----------

First, install Node.js (v14 or later) if you haven't. Then install zpkg:

```
npm i -g zpkg
```

Now you can make your apps.


Websites
--------

To make a website, put your HTML and other files in `client/`, referring to TypeScript files with `<script src="example.ts"></script>`. zpkg will compile these to `client-dist/`.

Every `.html` file will be treated as an entry point and its `<script>` tags pointing to `.ts` files will be built and bundled. Because it's bundled, you can freely import libraries installed with `npm install`, or files from `src/` or `server/`.


Node.js servers
---------------

Put your server code as `.ts` files in `server/`. They will be compiled to JavaScript files in `server-dist/`.

`server/index.ts` should be the entry point for launching the server.


NPM libraries
-------------

Put your library code as `.ts` files in `src/`. They will be compiled to JavaScript files in `dist/`.

`server/index.ts` will be treated as the entry point and its exports should be the library's exports.


Building
--------

Use the `zpkg` command while inside your project to build. `zpkg w` will build and watch (while it runs, you can just save files and it will auto-rebuild).
