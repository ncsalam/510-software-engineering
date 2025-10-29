import { app, PORT } from "./app.mjs";
import { COLORS, color } from "./server/terminal-helper.mjs";

app.listen(PORT, () => {
  console.log(
    "Started server at " +
      color(`http://localhost:${PORT}`, { fg: COLORS.YELLOW }),
  );
});
