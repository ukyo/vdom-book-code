import { createElement } from "./createElement";

console.log(
  JSON.stringify(
    <section bar="bar">
      <h1>title</h1>
      <p>hello</p>
    </section>,
    null,
    2
  )
);
