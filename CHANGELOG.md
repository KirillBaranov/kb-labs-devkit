## [1.2.0] - 2026-04-06

> **@kb-labs/devkit** 1.1.0 → 1.2.0 (minor: new features)

### ✨ New Features

- **tsup/node**: Automatically derives entry points from the package.json exports, simplifying project setup and reducing configuration errors for developers.
- **general**: Introduces an `isPolicyPassing` utility function to the policy-contracts, allowing users to easily check if a given policy check has passed, enhancing decision-making in applications (#1).
- **eslint**: Adds a plugin preset export that enforces architectural boundaries, helping teams maintain code quality and structure across large projects.
- **eslint**: Introduces a new plugin preset focused on architectural boundary enforcement, ensuring that code adheres to design principles for better maintainability.
- **tsup**: Enhances output options by adding dts files to all preset configurations, improving TypeScript support and making it easier to manage type definitions across projects.

### 🐛 Bug Fixes

- **general**: Enhances compatibility with Node.js by adding type definitions, ensuring smoother integration and fewer runtime errors for users relying on TypeScript.
## [1.1.0] - 2026-04-06

> **@kb-labs/devkit** 1.0.0 → 1.1.0 (minor: new features)

### ✨ New Features

- **tsup/node**: Automatically derives entry points from package.json exports, simplifying the build process for developers and reducing potential configuration errors.
- **general**: Introduces the `isPolicyPassing` utility function, which helps users easily determine if their policy checks are successful, enhancing the reliability of policy management (#1).
- **eslint**: Adds a plugin preset export that enforces code boundaries, promoting best practices and maintaining code quality across projects.
- **eslint**: Implements architectural boundary enforcement in the plugin preset, ensuring that developers adhere to design principles, which helps prevent architectural drift.
- **tsup**: Adds TypeScript declaration file (dts) output to all preset configurations, improving type support and making it easier for developers to integrate and use the presets in their projects.

### 🐛 Bug Fixes

- **general**: Enhances compatibility with Node.js environments by specifying type definitions, ensuring smoother development experiences and reducing potential errors.
## [1.1.0] - 2026-03-04

> **@kb-labs/devkit** 1.0.0 → 1.1.0 (manual)
