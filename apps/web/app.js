// Plesk Node.js entry point for the Next.js application.
const { createServer } = require("node:http");
const next = require("next");

const hostname = "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const app = next({ dev: false, dir: __dirname, hostname, port });
const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    createServer((request, response) => handle(request, response)).listen(port, hostname, () => {
      console.log(`Starlog is ready on ${hostname}:${port}`);
    });
  })
  .catch((error) => {
    console.error("Could not start Starlog", error);
    process.exit(1);
  });
