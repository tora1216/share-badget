export const APP_VERSION = "1.0.0";

export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-03-07",
    title: "初回リリース",
    changes: [
      "カレンダー形式のトップページ",
      "カレンダーセルに収支・予定を表示",
      "カテゴリ管理",
      "割り勘機能を追加",
      "カレンダーへの予定追加機能を追加",
      "固定費の登録・削除機能を追加（日付不要）",
      "月額の支出・収入・収支合計を表示",
      "ボトムナビを追加（カレンダー・管理・レポート・メニュー）",
      "レポートページを追加（カテゴリ別グラフ・月次トレンド）",
      "収支・予定・固定費の編集に対応",
      "ダークモードに対応",
    ],
  },
];
