import type { AnimeInfoBase, ResType, Tag } from "./types";

type MessageParams = {
  title: string;
  id: number;
  botToken: string;
  chatId: string;
  caption: string;
  parse_mode: string;
  resList: ResType[];
};

let base_url = "";

export const updateBaseUrl = (url: string) => {
  base_url = url;
};

export const searchAnime = async (value: string | number, site: string): Promise<AnimeInfoBase[]> => {
  if (!base_url) return [];

  const res = await fetch(`${base_url}/searchAnime?value=${value}&site=${site}`);
  return (await res.json()).data;
};

export const sendMessage = async (params: MessageParams) => {
  if (!base_url) return;

  const { resList, ...p } = params;
  const formData = new FormData();
  const files: { file: File, name: string; }[] = [];
  const media = resList.map((p, index) => {
    if (p.file) {
      files.push({ file: p.file, name: `${p.file.name}` });
    }

    return p.type.includes("video") ? {
      type: "video",
      media: p.file ? `attach://${p.file.name}` : p.url,
      has_spoiler: p.has_spoiler,
      supports_streaming: true,
      cover: p.cover,
      width: p.width,
      height: p.height,
      duration: p.duration,
    } : {
      type: "photo",
      media: p.file ? `attach://${p.file.name}` : p.url,
      has_spoiler: p.has_spoiler
    };
  });

  formData.append("info", JSON.stringify({ ...p, media }));
  files.forEach(p => formData.append("files", p.file, p.name));

  return fetch(base_url + "/sendMessage", {
    method: "POST",
    body: formData
  }).then(res => {
    if (res.status >= 500) throw new Error("");
  });
};

export const getVideoThumbnail = async (videoUrl: string): Promise<{
  imgShowUrl: string,
  width: number,
  height: number,
  duration: number;
}> => {
  const video = await loadVideo(videoUrl);
  video.currentTime = Math.round(video.duration / 2);
  await new Promise(res => video.addEventListener('seeked', res, { once: true }));

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d', {
    willReadFrequently: true
  })!.drawImage(video, 0, 0);

  const frameUrl = canvas.toDataURL('image/png');
  URL.revokeObjectURL(videoUrl);

  return {
    imgShowUrl: frameUrl,
    width: video.videoWidth,
    height: video.videoHeight,
    duration: Math.round(video.duration)
  };
};


export const getVideoinfo = async (videoUrl: string) => {
  const video = await loadVideo(videoUrl);

  return {
    width: video.videoWidth,
    height: video.videoHeight,
    duration: Math.round(video.duration)
  };
};

const loadVideo = async (videoUrl: string) => {
  const video = document.createElement('video');
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.preload = "metadata";
  video.src = videoUrl;


  await new Promise((res, rej) => {
    video.onloadedmetadata = res;
    video.onerror = () => rej(new Error(`Failed to load video: ${videoUrl}`));
  });
  return video;
};