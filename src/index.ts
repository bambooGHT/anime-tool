import { createApp, h } from "vue";

import "@/index.css";
import { mainPage } from "./mainPage";


createApp(() => [
  h("h1", { style: "font-size: 22px; text-align: center;" }, "Anime1工具"),
  h(mainPage)
]
).mount(".main");