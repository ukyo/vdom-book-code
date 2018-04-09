import { ActionType, ActionsType, View, h, app } from "./lib/hyperapp";

let id = 0;

interface MessageAppState {
  newMessage: string;
  messages: { id: string; text: string }[];
}

interface MessageAppActions {
  updateNewMessage(ev: KeyboardEvent): MessageAppState;
  addMessage(ev: KeyboardEvent): MessageAppState;
  removeMessage(id: string): MessageAppState;
  reverseMessages(): MessageAppState;
}

const state: MessageAppState = {
  newMessage: "",
  messages: [],
};

const actions: ActionsType<MessageAppState, MessageAppActions> = {
  updateNewMessage: ev => state => ({ ...state, newMessage: ev.target.value }),
  addMessage: ev => state => {
    if (ev.keyCode !== 13 || !ev.target.value) return state;
    const message = {
      id: String(id++),
      text: state.newMessage,
    };
    ev.target.value = "";
    return {
      ...state,
      newMessage: "",
      messages: [message, ...state.messages],
    };
  },
  removeMessage: (id: string) => state => ({
    ...state,
    messages: state.messages.filter(m => m.id !== id),
  }),
  reverseMessages: () => state => ({
    ...state,
    messages: state.messages.reverse(),
  }),
};

const view: View<MessageAppState, MessageAppActions> = (state, actions) => (
  <div>
    <div>
      <input
        type="text"
        onkeypress={actions.addMessage}
        oninput={actions.updateNewMessage}
      />
    </div>
    <div>
      <button onclick={actions.reverseMessages}>reverse</button>
    </div>
    <div>
      {state.messages.map(m => (
        <div key={m.id}>
          <span>{m.text}</span>
          <button onclick={() => actions.removeMessage(m.id)}>×</button>
        </div>
      ))}
    </div>
  </div>
);

const messageApp = app(
  state,
  actions,
  view,
  document.getElementById("container")
);
