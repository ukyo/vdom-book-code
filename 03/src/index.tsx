import { h } from "./h";
import { createRenderer } from "./renderer";

let messages = [];
let id = 0;
let enabled = true;

const render = createRenderer(document.getElementById("container"));

function addNewMessage(ev: KeyboardEvent) {
  const el = ev.target as HTMLInputElement;
  if (ev.keyCode !== 13 || !el.value) return;
  messages.push({
    id: id++,
    text: el.value,
  });
  el.value = "";
  render(<App />);
}

function reverseMessages() {
  messages.reverse();
  render(<App />);
}

function removeMessage(id: number) {
  messages = messages.filter(m => m.id !== id);
  render(<App />);
}

function toggleEnabled() {
  enabled = !enabled;
  render(<App />);
}

function hello() {
  console.log("hello");
}

const App = () => (
  <div style="color: #999;">
    <div>
      <input type="text" onkeypress={addNewMessage} />
    </div>
    <div onupdate={hello}>
      <button onclick={reverseMessages}>reverse</button>
      <button onclick={toggleEnabled}>toggle enabled</button>
    </div>
    <div>
      {enabled && (
        <div onremove={hello}>
          {messages.map(m => (
            <div key={m.id}>
              <span>{m.text}</span>
              <button onclick={() => removeMessage(m.id)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// render(<App />);

const arr = [];
for (let i = 0; i < 3000; ++i) {
  arr.push(i);
}

let text = "";
const updateText = (ev: KeyboardEvent) => {
  text = (ev.target as HTMLInputElement).value;
  render(<HeavyComponent />);
};

const HeavyComponent = () => (
  <div>
    <div>
      <input oninput={updateText} />
      {text}
    </div>
    {arr.map(i => <div>{i}</div>)}
  </div>
);

setInterval(() => {
  arr.push(arr.shift());
  render(<HeavyComponent />);
}, 100);
