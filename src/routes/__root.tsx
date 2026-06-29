import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import indexCss from "../styles/index.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "MCP Dashboard Wireframe" },
      {
        name: "description",
        content:
          "Streamline management with a unified dashboard that consolidates data and insights for efficient decision-making and enhanced productivity.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "stylesheet", href: indexCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style>{`html, body { height: 100%; margin: 0; } #root { height: 100%; }`}</style>
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
