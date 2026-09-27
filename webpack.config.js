import path from 'node:path';
import CopyWebpackPlugin from 'copy-webpack-plugin';

export default (env, argv) => ({
  entry: {
    content: './src/content.ts',
    popup: './src/popup.ts',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(import.meta.dirname, 'dist'),
    clean: true,
  },
  devtool: argv.mode === 'development' ? 'cheap-module-source-map' : false,
  stats: {
    children: false,
    chunks: false,
    modules: false,
  },
  performance: {
    hints: false,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: ['manifest.json', 'popup.html', { from: 'icons', to: 'icons' }],
    }),
  ],
});
