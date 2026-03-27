import { App } from "@modelcontextprotocol/ext-apps";

const timeElement = document.getElementById("time")!;
const refreshButton = document.getElementById("refresh")!;

const app = new App({ name: "get_time", version: "1.0.0" });

function updateTimeFromResult(result: { content?: Array<{ type: string; text?: string }> }): void {
  const value = result.content?.find((item) => item.type === "text")?.text;
  timeElement.textContent = value ?? "[ERROR]";
}

app.ontoolresult = updateTimeFromResult;

refreshButton.addEventListener("click", async () => {
  const result = await app.callServerTool({ name: "get_time", arguments: {} });
  updateTimeFromResult(result);
});

await app.connect();
