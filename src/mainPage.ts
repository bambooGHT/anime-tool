import { h, ref } from "vue";
import { updateBaseUrl } from "./api";
import {
  addAnimeRes, addConfigTag, animeInfo, currentAnimeInfo, animeTags,
  config, deleteAnimeRes, deleteConfigTag, getAnimeInfo, saveConfig,
  sendTgMessage, swapAnimeResItems, uploadAnimeRes, changeCurrentAnimeInfo, sendStatus, SendStatus
} from "./data";

export const mainPage = () => {
  return [
    h(searchBox),
    h(resultItemsBox),
    h(contentBox),
  ];
};

const searchBox = () => {
  return h("section", { class: "flex-box search-box", style: "justify-content: center;" }, [
    h("input", {
      type: "search", id: "search", placeholder: "search", style: "width: 100%; max-width: 30rem;",
      onKeydown: (e: any) => {
        if (e.key === "Enter") {
          getAnimeInfo(e.target.value, "hanime");
        }
      }
    }),
    h("button", { class: "button1", onClick: () => getAnimeInfo(document.querySelector<HTMLInputElement>("#search")!.value, "hanime") }, "hanime"),
    h("button", { class: "button1", onClick: () => getAnimeInfo(document.querySelector<HTMLInputElement>("#search")!.value, "noodlemagazine") }, "noodlemagazine")
  ]);
};

const resultItemsBox = () => {
  return h("section", { class: "results" }, animeInfo.map((p, index) => {
    return h("button", {
      class: { "button1": true, "selected": p.name + p.resList[0]?.url === currentAnimeInfo.name + currentAnimeInfo.resList[0]?.url },
      onClick: () => changeCurrentAnimeInfo(index)
    }, p.name || "undefined");
  }));
};

const contentBox = () => {
  return h("section", { class: "content" }, [
    h(resBox()),
    h(infoBox())
  ]);
};

const resBox = () => {
  const resUrl = ref("");
  return () => h("section", { class: "box" }, [
    h("ul", { class: "res-box" }, [
      currentAnimeInfo.resList.map((item, i) => {
        return h("li", { key: i }, [
          h("section", [
            h("span", {
              innerHTML: "&#10005;", onClick: () => deleteAnimeRes(i)
            }),
            h("div", {
              onClick: () => swapAnimeResItems(i, i - 1)
            }),
            h("div", {
              onClick: () => swapAnimeResItems(i, i + 1)
            }),
            h("img", { src: item.imgShowUrl || item.url })
          ]),
          h("div", [
            `[${item.type}${item.size ? ` (${item.size})` : ""}]`,
            h("input", { type: "checkbox", value: item.has_spoiler, onChange: () => item.has_spoiler = !item.has_spoiler })
          ])
        ]);
      })
    ]),
    h("section", { class: "flex-box" }, [
      h("input", {
        type: "text", placeholder: "video/image url", value: resUrl.value,
        onInput: (e: any) => {
          resUrl.value = e.target.value;
        },
      }),
      h("button", {
        class: "button1", onClick: () => {
          addAnimeRes(resUrl.value, "image");
          resUrl.value = "";
        }
      }, "add image"),
      h("button", {
        class: "button1", onClick: () => {
          addAnimeRes(resUrl.value, "video");
          resUrl.value = "";
        }
      }, "add video"),
      h("button", { class: "button1", onClick: uploadAnimeRes }, "上传")
    ])
  ]);
};

const infoBox = () => {
  const tag = ref("");
  return () => h("section", { class: "box" }, [
    h("p", { class: "title" }, "标题"),
    h("input", {
      type: "text", placeholder: "title", value: currentAnimeInfo.name,
      onChange: (e: any) => {
        currentAnimeInfo.name = e.target.value;
      }
    }),
    h("p", { class: "title" }, "中文标题"),
    h("input", {
      type: "text", placeholder: "CN title", value: currentAnimeInfo.CN_name,
      onChange: (e: any) => {
        currentAnimeInfo.CN_name = e.target.value;
      }
    }),
    h("p", { class: "title" }, "描述"),
    h("textarea", {
      placeholder: "description", value: currentAnimeInfo.description,
      onChange: (e: any) => {
        currentAnimeInfo.description = e.target.value;
      }
    }),
    h("p", { class: "title" }, "标签"),
    h("ul", { class: "tag-box" }, [
      ...currentAnimeInfo.tags.map(p => {
        return h("li", {
          key: p.title,
          class: {
            tag: true, "tag-selected": p.selected
          },
          onClick: () => {
            p.selected = !p.selected;
          }
        },
          p.title,
        );
      })
    ]),
    animeTags.length && currentAnimeInfo.tags.length ? h("hr") : null,
    h("ul", { class: "tag-box" }, [
      ...animeTags.map((p, index) => {
        return h("li", {
          key: p.title,
          class: {
            tag: true, "tag-selected": p.selected
          },
          onClick: () => {
            p.selected = !p.selected;
          }
        },
          [p.title,
          h("span", {
            class: "tag-x", innerHTML: "&times;",
            onClick: (e) => {
              e.stopPropagation();
              deleteConfigTag(index);
            }
          })]
        );
      })
    ]),
    h("section", { class: "flex-box" }, [
      h("input", {
        type: "text", style: "max-width: 100%;", placeholder: "tag",
        value: tag.value,
        onInput: (e: any) => {
          tag.value = e.target.value;
        },
        onKeydown: (e: any) => {
          if (e.key === "Enter") {
            addConfigTag(tag.value);
            tag.value = "";
          }
        }
      }),
      h("button", {
        class: "button1", onclick: () => {
          addConfigTag(tag.value, false);
          tag.value = "";
        }
      }, "添加"),
      h("button", {
        class: "button1", onclick: () => {
          addConfigTag(tag.value, true);
          tag.value = "";
        }
      }, "临时添加")
    ]),
    h("section", { class: "flex-box" }, [
      h("button", {
        class: "button1", onClick: () => {
          (document.getElementById("dialog1") as HTMLDialogElement).showModal();
        }
      }, "配置"),
      h("button", { class: "button1", onClick: sendTgMessage }, "发送"),
      sendStatus.value !== SendStatus.Pending && h("button", { class: "button1", style: "pointer-events: none;" }, "send " + SendStatus[sendStatus.value].toLowerCase()),
    ]),
    h("dialog", {
      id: "dialog1", onClick: (e) => {
        const rect = (e.currentTarget as HTMLDialogElement).getBoundingClientRect();
        if (e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom) {
          (e.currentTarget as HTMLDialogElement).close();
        }
      }
    }, [
      h("input", {
        type: "text", placeholder: "bot token", value: config.botToken,
        onChange: (e: any) => {
          config.botToken = e.target.value;
          saveConfig();
        }
      }),
      h("input", {
        type: "text", placeholder: "chat id", value: config.chatId,
        onChange: (e: any) => {
          config.chatId = e.target.value;
          saveConfig();
        }
      }),
      h("input", {
        type: "text", placeholder: "api url", value: config.apiUrl,
        onChange: (e: any) => {
          config.apiUrl = e.target.value.replace(/\/$/, '');
          saveConfig();
          updateBaseUrl(e.target.value);
        }
      }),
    ])
  ]);
};