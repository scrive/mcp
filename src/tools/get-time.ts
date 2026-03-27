export function getTimeHandler() {
  return async () => {
    const now = new Date().toISOString();

    return {
      content: [{ type: "text" as const, text: now }],
      structuredContent: { time: now },
    };
  };
}
