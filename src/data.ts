import { reactive, ref, toRaw } from "vue";
import type { AnimeInfo, AnimeInfoBase, Config, ResType, Tag } from "./types";
import { getVideoinfo, getVideoThumbnail, searchAnime, sendMessage, updateBaseUrl } from "./api";
import { SendStatus } from "./enums";

const animeInfoBase: AnimeInfo = {
  name: "",
  CN_name: "",
  description: "",
  id: 0,
  resList: [],
  tags: [],
  timedSend: "",
  sendStatus: SendStatus.Pending
};

const tagsBase: Tag[] = [
  {
    "selected": false,
    "title": "無碼",
    temporary: true
  },
  {
    "selected": false,
    "title": "AI解碼",
    temporary: true
  },
  {
    "selected": false,
    "title": "中文字幕",
    temporary: true
  },
  {
    "selected": false,
    "title": "中文配音",
    temporary: true
  },
  {
    "selected": false,
    "title": "1080p",
    temporary: true
  },
  {
    "selected": false,
    "title": "60FPS",
    temporary: true
  },
  {
    "selected": false,
    "title": "ASMR",
    temporary: true
  },
  {
    "selected": false,
    "title": "斷面圖",
    temporary: true
  }
];

export const config: Config = (() => {
  let c: any = localStorage.getItem("config");
  c = c ? JSON.parse(c) : {
    botToken: "",
    chatId: "",
    apiUrl: "",
    tags: structuredClone(tagsBase)
  };

  if (c.apiUrl) {
    c.apiUrl = c.apiUrl.replace(/\/$/, '');
    updateBaseUrl(c.apiUrl);
  };

  return c;
})();

const scheduleQueue = {
  timer: null as null | number,
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 1000);
  },
  stop() {
    this.timer && clearInterval(this.timer);
    this.timer = null;
  },
  tick() {
    const chinaTime = Date.now();
    let s = false;

    for (const item of animeSendList) {
      if (item.sendStatus === SendStatus.Pending && item.timedSend) {
        s = true;
        const t = new Date((<string>item.timedSend).replace(' ', 'T') + '+08:00').getTime();
        if (t <= chinaTime) {
          sendTgMessage(item);
        }
      };
      if (!s) {
        this.stop();
      }
    }
  }
};

export const animeInfo = reactive<AnimeInfo[]>([structuredClone(animeInfoBase)]);
export const currentAnimeInfo = ref(animeInfo[0]);
export const animeTags = reactive<Tag[]>(structuredClone(config.tags));
export const animeSendList = reactive<AnimeInfo[]>([]);

export const getAnimeInfo = async (value: string | number, site: "hanime" | "noodlemagazine") => {
  const data = await searchAnime(value, site);

  if (!data.length) {
    animeInfo.splice(0, animeInfo.length, structuredClone(animeInfoBase));
    changeCurrentAnimeInfo(0);
    return;
  }

  await setAnimeInfo(data);
};

const setAnimeInfo = async (data: AnimeInfoBase[]) => {
  const result: AnimeInfo[] = await Promise.all(data.map(async (item) => {
    const { images, videos, tags, ...v } = item;
    const imageList = images.map<ResType>(p => {
      return {
        type: p.type,
        has_spoiler: false,
        url: p.url,
        imgShowUrl: p.imgShowUrl && p.imgShowUrl.includes("imgProxy") ? config.apiUrl + p.imgShowUrl : p.imgShowUrl
      };
    });
    const videoList = await Promise.all(videos.map<Promise<ResType>>(async (p) => {
      const videoI = await getVideoinfo(`${config.apiUrl}/videoProxy?url=${p.url}`).catch(() => {
        return {};
      });
      return {
        type: p.type,
        size: p.size,
        has_spoiler: false,
        url: p.url,
        imgShowUrl: p.imgShowUrl && p.imgShowUrl.includes("imgProxy") ? config.apiUrl + p.imgShowUrl : p.imgShowUrl,
        cover: p.cover,
        ...videoI
      };
    }));
    const baseTagMap = new Map(animeTags.map(p => [p.title, p]));
    const tagList = tags.reduce<Tag[]>((list, cur) => {
      const t = baseTagMap.get(cur);
      if (t) t.selected = true;
      else {
        list.push({
          selected: true,
          temporary: false,
          title: cur
        });
      }
      return list;
    }, []);

    return {
      ...v, resList: [...imageList, ...videoList], tags: tagList,
      timedSend: "",
      sendStatus: SendStatus.Pending
    };
  }));

  animeInfo.splice(0, animeInfo.length, ...result);
  changeCurrentAnimeInfo(0);
};

export const addAnimeToSendList = (_animeInfo: AnimeInfo) => {
  let item = animeSendList.find(p => p === _animeInfo);
  if (item) return;

  animeSendList.push(_animeInfo);
  scheduleQueue.start();
};

export const modifyAnimeInfo = (_animeInfo: AnimeInfo) => {
  let index = animeInfo.findIndex(p => p === _animeInfo);
  if (index === -1) {
    animeInfo.push(_animeInfo);
    index = animeInfo.length - 1;
  }

  changeCurrentAnimeInfo(index);
};

export const removeAnimeInfo = (_animeInfo: AnimeInfo) => {
  const index = animeSendList.findIndex(p => p === _animeInfo);
  if (index !== -1) animeSendList.splice(index, 1);
};

export const changeCurrentAnimeInfo = (index: number) => {
  currentAnimeInfo.value = animeInfo[index];
};

export const addConfigTag = (title: string, temporary: boolean = false) => {
  title = title.trim();
  if (!title || [...animeTags, ...currentAnimeInfo.value.tags].find(p => p.title === title)) return;

  const index = currentAnimeInfo.value.tags.findIndex(p => p.title === title);
  if (index !== -1 && temporary) currentAnimeInfo.value.tags.splice(index, 1);

  animeTags.push({ selected: true, temporary, title });
  saveConfig();
};

export const deleteConfigTag = (index: number) => {
  animeTags.splice(index, 1);
  saveConfig();
};

export const saveConfig = () => {
  config.tags = structuredClone(toRaw(animeTags)).filter(p => !p.temporary).map(p => (p.selected = false, p));
  localStorage.setItem("config", JSON.stringify(config));
};

export const addAnimeRes = async (url: string, type: "image" | "video") => {
  const cleanUrl = url.trim();
  if (
    !config.apiUrl ||
    !cleanUrl ||
    !cleanUrl.startsWith("http") ||
    currentAnimeInfo.value.resList.some(i => i.url === cleanUrl)
  ) return;

  const proxyUrl = `${config.apiUrl}/${type === "video" ? "videoProxy" : "imgProxy"}?url=${cleanUrl}`;

  let imgShowUrl = proxyUrl;
  let extra = {};

  if (type === "video") {
    const r = await getVideoThumbnail(proxyUrl);
    imgShowUrl = r.imgShowUrl;
    extra = r;
  }

  currentAnimeInfo.value.resList.push({
    type,
    has_spoiler: false,
    url: cleanUrl,
    imgShowUrl,
    ...extra
  });
};

export const uploadAnimeRes = async () => {
  const fileHandles = await (<any>window).showOpenFilePicker({
    multiple: true,
    types: [{
      description: 'Images & Videos',
      accept: {
        'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff'],
        'video/*': ['.mp4', '.webm', '.mov', ".avi", ".wmv", ".mkv"]
      }
    }]
  });

  for (const handle of fileHandles) {
    const file = await handle.getFile();
    if (currentAnimeInfo.value.resList.find(p => {
      if (p.file) return `${p.file.lastModified}_${p.file.size}` === `${file.lastModified}_${file.size}`;
    })) return;

    if (file.type.startsWith('image/')) {
      currentAnimeInfo.value.resList.push({ type: file.type, has_spoiler: false, url: URL.createObjectURL(file), file });
    } else if (file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file);
      const { imgShowUrl, ...videoI } = await getVideoThumbnail(videoUrl);

      URL.revokeObjectURL(videoUrl);
      currentAnimeInfo.value.resList.push({ type: file.type, has_spoiler: false, url: imgShowUrl, file, ...videoI });
    }
  }
};

export const deleteAnimeRes = (index: number) => {
  currentAnimeInfo.value.resList.splice(index, 1);
};

export const swapAnimeResItems = (index: number, index2: number) => {
  const { resList } = currentAnimeInfo.value;
  if (!resList[index2]) return;

  [resList[index], resList[index2]] = [resList[index2], resList[index]];
};

export const sendTgMessage = (_animeInfo: AnimeInfo) => {
  const { botToken, chatId } = config;
  if (!botToken || !chatId) return;

  _animeInfo.sendStatus = SendStatus.Sending;

  const { name, id, CN_name, description, resList, tags } = toRaw(_animeInfo);
  const tagList = [...tags, ...animeTags].filter(p => p.selected);
  const text = [
    "#" + name.trim(),
    CN_name.trim(),
    "\n" + description.trim(),
    "\n" + tagList.map(p => "#" + p.title).join(" ")
  ].filter(Boolean).join("\n");

  sendMessage({
    title: name,
    id,
    botToken: config.botToken,
    chatId: config.chatId,
    caption: escapeMarkdownV2(text),
    parse_mode: "MarkdownV2",
    resList
  }).then(() => _animeInfo.sendStatus = SendStatus.Success)
    .catch(() => _animeInfo.sendStatus = SendStatus.Failed);

  if (animeSendList.find(p => p === _animeInfo)) return;
  animeSendList.push(_animeInfo);
};

function escapeMarkdownV2(text: string, excludeReservedChars: string[] = []) {
  if (!text.length) return text;

  let reservedChars = ['_', '*', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!', '(', ')', '[', ']'];
  if (excludeReservedChars.length) {
    reservedChars = reservedChars.filter(P => !excludeReservedChars.includes(P));
  }
  const escapedChars = reservedChars.map(char => '\\' + char).join('');
  const regex = new RegExp(`([${escapedChars}])`, 'g');
  return text.replace(regex, '\\$1');
}