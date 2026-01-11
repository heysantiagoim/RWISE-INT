const path = require("path");
const webpack = require("webpack");
require('dotenv').config();

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "content.bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  mode: "production",
  plugins: [
    new webpack.DefinePlugin({
      'process.env.GOOGLE_CLOUD_API_KEY': JSON.stringify(process.env.GOOGLE_CLOUD_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY)
    })
  ]
};