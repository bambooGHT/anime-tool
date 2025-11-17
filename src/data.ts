import { reactive, ref, toRaw } from "vue";
import type { AnimeInfo, Config, ResType, Tag } from "./types";
import { getVideoinfo, getVideoThumbnail, searchAnime, sendMessage, updateBaseUrl } from "./api";

export enum SendStatus {
  Pending,
  Sending,
  Success,
  Failed,
}
const animeInfoBase: AnimeInfo = {
  name: "",
  CN_name: "",
  description: "",
  resList: [],
  tags: []
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


export const animeInfo = reactive<AnimeInfo[]>([structuredClone(animeInfoBase)]);
export const currentAnimeInfo = reactive(structuredClone(toRaw(animeInfo)[0]));
export const animeTags = reactive<Tag[]>(structuredClone(config.tags));
export const sendStatus = ref(SendStatus.Pending);

export const getAnimeInfo = async (value: string | number, site: "hanime" | "noodlemagazine") => {
  const data = await searchAnime(value, site);

  if (!data.length) {
    animeInfo.splice(0, animeInfo.length, structuredClone(animeInfoBase));
    changeCurrentAnimeInfo(0);
    return;
  }

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

    return { ...v, resList: [...imageList, ...videoList], tags: tagList };
  }));

  animeInfo.splice(0, animeInfo.length, ...result);
  changeCurrentAnimeInfo(0);
};

export const changeCurrentAnimeInfo = (index: number) => {
  Object.assign(currentAnimeInfo, structuredClone(toRaw(animeInfo)[index]));
};

export const addConfigTag = (title: string, temporary: boolean = false) => {
  title = title.trim();
  if (!title || [...animeTags, ...currentAnimeInfo.tags].find(p => p.title === title)) return;

  const index = currentAnimeInfo.tags.findIndex(p => p.title === title);
  if (index !== -1 && temporary) currentAnimeInfo.tags.splice(index, 1);

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
    currentAnimeInfo.resList.some(i => i.url === cleanUrl)
  ) return;

  const proxyUrl = `${config.apiUrl}/${type === "video" ? "videoProxy" : "imgProxy"}?url=${cleanUrl}`;

  let imgShowUrl = proxyUrl;
  let extra = {};

  if (type === "video") {
    const r = await getVideoThumbnail(proxyUrl);
    imgShowUrl = r.imgShowUrl;
    extra = r;
  }

  currentAnimeInfo.resList.push({
    type,
    has_spoiler: false,
    url: cleanUrl,
    imgShowUrl,
    ...extra
  });
};

export const uploadAnimeRes = async () => {
  const fileHandles = await window.showOpenFilePicker({
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
    if (currentAnimeInfo.resList.find(p => {
      if (p.file) return `${p.file.lastModified}_${p.file.size}` === `${file.lastModified}_${file.size}`;
    })) return;

    if (file.type.startsWith('image/')) {
      currentAnimeInfo.resList.push({ type: file.type, has_spoiler: false, url: URL.createObjectURL(file), file });
    } else if (file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file);
      const { imgShowUrl, ...videoI } = await getVideoThumbnail(videoUrl);

      URL.revokeObjectURL(videoUrl);
      currentAnimeInfo.resList.push({ type: file.type, has_spoiler: false, url: imgShowUrl, file, ...videoI });
    }
  }
};

export const deleteAnimeRes = (index: number) => {
  currentAnimeInfo.resList.splice(index, 1);
};

export const swapAnimeResItems = (index: number, index2: number) => {
  const { resList } = currentAnimeInfo;
  if (!resList[index2]) return;

  [resList[index], resList[index2]] = [resList[index2], resList[index]];
};

export const sendTgMessage = () => {
  const { botToken, chatId } = config;
  if (!botToken || !chatId || sendStatus.value == SendStatus.Sending) return;
  sendStatus.value = SendStatus.Sending;

  const { name, CN_name, description, resList, tags } = toRaw(currentAnimeInfo);
  const tagList = [...tags, ...animeTags].filter(p => p.selected);
  const text = [
    "#" + name.trim(),
    CN_name.trim(),
    "\n" + description.trim(),
    "\n" + tagList.map(p => "#" + p.title).join(" ")
  ].filter(Boolean).join("\n");

  sendMessage({
    title: name,
    botToken: config.botToken,
    chatId: config.chatId,
    caption: escapeMarkdownV2(text),
    parse_mode: "MarkdownV2",
    resList
  }).then(() => sendStatus.value = SendStatus.Success)
    .catch(() => sendStatus.value = SendStatus.Failed);
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