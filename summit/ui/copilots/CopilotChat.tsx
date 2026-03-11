interface CopilotMessage {
  id: string;
  sender: 'analyst' | 'copilot';
  text: string;
  createdAt: string;
}

interface CopilotChatProps {
  messages: CopilotMessage[];
}

export function CopilotChat({ messages }: CopilotChatProps) {
  return (
    <section aria-label="copilot-chat">
      <h3>Copilot Chat</h3>
      <ul>
        {messages.map((message) => (
          <li key={message.id}>
            [{message.sender}] {message.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
