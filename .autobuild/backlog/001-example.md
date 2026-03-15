---
id: "001"
title: Scaffold a project
extensibility_scenario: |
  Adding new UI components or new test cases should require minimal changes to the project files.
variation_instructions:
 - "Research the which component library fits best with our simple no-framework philosophy"
---
Scaffold a project for us to build on.
Stack: plain HTML and DOM usage (vanilla JS, WebComponents etc.), use a lightweight component library to make things like better.
No client side routing.
Create reusable components, functions and classes.
There should be some placeholder tests that run directly when executing `npm run test`.
There should be an `npm run dev` command that runs a dev server for local development and validation.
There should be a .gitignore file that excludes things from git that pertaining to the tools in the project.
No documentation or comments. Just the code.
