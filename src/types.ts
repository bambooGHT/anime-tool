import type { DateValue } from "tdesign-vue-next";
import type { SendStatus } from "./enums";

export interface Tag { selected: boolean, temporary: boolean, title: string; };
export interface ResType {
  type: string,
  size?: string;
  has_spoiler: boolean,
  file?: File,
  url: string;
  imgShowUrl?: string;
  cover?: string;
  width?: number;
  height?: number;
  duration?: number;
};

export interface Config { botToken: string; chatId: string; apiUrl: string; tags: Tag[]; }

export interface AnimeInfoBase {
  name: string,
  CN_name: string;
  description: string;
  id: number;
  images: { type: string, url: string, imgShowUrl: string; }[];
  videos: {
    type: string,
    size: string,
    url: string;
    imgShowUrl: string;
    cover: string;
  }[];
  tags: string[];
}

export interface AnimeInfo {
  name: string,
  CN_name: string;
  description: string;
  id: number;
  resList: ResType[];
  tags: Tag[];
  timedSend: DateValue;
  sendStatus: SendStatus;
}