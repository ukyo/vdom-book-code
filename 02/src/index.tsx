import { h } from "./h";
import { createRenderer } from "./simple-renderer";

const render = createRenderer(document.getElementById("container"));

let newMessage = "";
let messages = [];
let id = 0;
let enabled = true;

function addNewMessage(ev: KeyboardEvent) {
  const el = ev.target as HTMLInputElement;
  if (ev.keyCode !== 13 || !el.value) return;
  messages.push({
    id: id++,
    text: newMessage,
  });
  el.value = newMessage = "";
  render(<App />);
}

function updateNewMessage(ev: KeyboardEvent) {
  newMessage = (ev.target as HTMLInputElement).value;
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
      <input
        type="text"
        onkeypress={addNewMessage}
        oninput={updateNewMessage}
      />
    </div>
    <div onupdate={hello}>
      <button onclick={reverseMessages}>reverse</button>
      <button onclick={toggleEnabled}>toggle enabled</button>
    </div>
    <div>
      {enabled && (
        <div>
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

render(<App />);

// App();
