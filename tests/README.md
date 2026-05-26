# 静的チェック

`check-static-app.js` はNode標準ライブラリだけで動く簡易品質ゲートです。

## 実行

```bash
node tests/check-static-app.js
```

## 検査内容

- 必須ファイルの存在
- `index.html` から `styles.css` と `app.js` が読み込まれていること
- 画面操作に必要なDOM IDが揃っていること
- 全体PNG、1インスタンスPNG、2インスタンスPNGの保存ボタンIDが揃っていること
- `instance-poster` レイアウトoptionがあり、`app.js`から参照されていること
- メンバー画像追加が複数画像対応のファイル入力になっていること
- `app.js` がJavaScriptとしてパースできること
- PNG出力、JSON入出力、下書き保存、サンプル生成などの主要関数が存在すること
- 初期メンバー画像20件が `assets/members/` に存在し、`app.js` から参照されていること
- 現在選択中の `未` / `1` / `2` ボタンへ色を付けるスタイルがあること
- CSSに主要レイアウト、プレビュー、レスポンシブ定義があること
- Electron配布用の `package.json` スクリプトがあること
- READMEに使い方、GitHub Pages、exe化、JSON、PNG、インスタンス別PNG保存の説明があること
