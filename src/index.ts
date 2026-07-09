import { createApp, h } from "vue";

import { mainPage } from "./mainPage";
import { Space as TSpace, DatePicker as TDatePicker } from 'tdesign-vue-next';

import "@/index.css";
import 'tdesign-vue-next/es/style/index.css';

const app = createApp(() => [
  h("h1", { style: "font-size: 22px; text-align: center;" }, "Anime1工具"),
  h(mainPage)
]
);
app.use(TSpace, TDatePicker);
app.mount(".main");