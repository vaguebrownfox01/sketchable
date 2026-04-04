module.exports = {
  apps: [
    {
      name: "sketchable",
      script: "server.js",
      cwd: "/home/darwin/Desktop/sketchable",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: 3100,
      },
    },
  ],
};
