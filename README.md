# JTV

JTV is a graphical environment for designing, executing, tracing, and analyzing Turing Machines. This web version modernizes the original Java application while preserving its core visual notation, machine model, execution trace tree, preinstalled submachines, custom submachines, legacy machine import, and example machines used for teaching Theory of Computation.

The application is built with Angular, PrimeNG, and TypeScript. It includes unit and integration tests that execute representative Turing Machines, including machines with multiple tapes, submachines, nondeterminism, suspended executions, and legacy XML imports.

## AI-assisted development

JTV was modernized with AI-assisted software engineering. GPT-5.6 was used as a design and reasoning assistant to discuss architecture, implementation strategies, migration decisions, and user-facing behavior. Codex was used as the coding agent inside the repository to inspect the codebase, implement features, refactor modules, fix bugs, add tests, and validate changes with the Angular/Vitest toolchain.

All generated or assisted changes were iteratively reviewed, tested, and adjusted against the behavior of the original JTV application.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## License

This project is licensed under the MIT License. See [LICENSE.txt](./LICENSE.txt).

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
