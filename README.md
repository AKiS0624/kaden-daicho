# 家電管理台帳(PWA)

家に番号を振って家電を登録・検索・廃棄管理するアプリです。
ビルド不要の静的サイトなので、GitHub Pagesにそのまま置けばPWA(ホーム画面に追加して使えるアプリ)として動きます。

## 機能

- 登録(品名・型番・カテゴリ・購入日・価格・購入場所・設置場所・保証期間・メモ)
- 管理番号は「連番」自動採番 または「任意の番号」を選んで指定
- 検索(番号・品名・型番・設置場所などから)
- QRコード発行(詳細画面。印刷して本体に貼れます) / カメラでQRスキャン検索
- 廃棄登録・使用中への復元
- JSONファイルでのバックアップ書き出し・復元

## ファイル構成

- `index.html` … 画面本体
- `app.js` … 動作ロジック(データ保存はブラウザのlocalStorage)
- `manifest.json` … PWA設定
- `sw.js` … オフライン対応用のservice worker
- `icon-192.png` / `icon-512.png` … アプリアイコン

## GitHub Pagesへの公開手順

1. GitHubで新しいリポジトリを作成する(例: `kaden-daicho`)
2. このフォルダの中身(`index.html`など)をすべてリポジトリのルートに追加してコミット・プッシュする
   ```bash
   git init
   git add .
   git commit -m "家電管理台帳を追加"
   git branch -M main
   git remote add origin https://github.com/【あなたのアカウント】/kaden-daicho.git
   git push -u origin main
   ```
3. GitHubのリポジトリ画面で **Settings → Pages** を開く
4. 「Build and deployment」の Source を **Deploy from a branch** にし、Branch を `main` / `/(root)` に設定して Save
5. 数分後、`https://【あなたのアカウント】.github.io/kaden-daicho/` でアクセスできるようになります

## スマホでアプリ化する

上記URLをスマホのブラウザで開き、共有メニューから「ホーム画面に追加」(iOS)または「アプリをインストール」(Android/Chrome)を選ぶと、通常のアプリのようにアイコンから起動できます。

## QRスキャンについて

カメラでのQRスキャンはブラウザの BarcodeDetector API を使っています。Android版Chromeなど対応ブラウザでのみ動作し、iOS Safariなど非対応の場合は「対応していません」と表示され、通常の検索が使えます。カメラはhttps接続時のみ利用できますが、GitHub Pagesは標準でhttps配信なので問題ありません。

## 注意点

- データはブラウザのlocalStorageに保存されます。ブラウザのデータを消去すると内容も消えるので、アプリ内の「バックアップを書き出す」でときどきJSONファイルを保存しておくと安心です。
- 複数の端末間ではデータは同期されません(端末ごとに別々に保存されます)。
