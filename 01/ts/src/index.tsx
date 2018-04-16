import { h } from "./h";

const Foo = () => <div>foo</div>;

console.log(
  JSON.stringify(
    <section bar="bar">
      <Foo />
    </section>,
    null,
    2
  )
);
