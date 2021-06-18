zpkg
====

`zpkg` is a system for making TypeScript web apps and Node.js server apps.

`zpkg` is opinionated and does not require configuration for normal use.


How?
----

First, install Node.js (v14 or later) if you haven't. Then install zpkg:

```
npm i -g zpkg
```

Now you can make your apps.


Websites
--------

To make a website, put your HTML and other files in `client/`, referring to TypeScript files with `<script src="example.ts"></script>`. zpkg will compile these to `client-dist/`.


Node.js servers
---------------

Put your server code as `.ts` files in `server/`. They will be compiled to JavaScript files in `server-dist/`.


NPM libraries
-------------

Put your library code as `.ts` files in `src/`. They will be compiled to JavaScript files in `dist/`.


Building
--------

Use the `zpkg` command while inside your project to build. `zpkg w` will build and watch (while it runs, you can just save files and it will auto-rebuild).
