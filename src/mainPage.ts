import { h, ref } from "vue";
import { updateBaseUrl } from "./api";
import {
  addAnimeRes, addConfigTag, animeInfo, currentAnimeInfo, animeTags,
  config, deleteAnimeRes, deleteConfigTag, getAnimeInfo, saveConfig,
  sendTgMessage, swapAnimeResItems, uploadAnimeRes, changeCurrentAnimeInfo,
  modifyAnimeInfo,
  removeAnimeInfo,
  animeSendList,
  addAnimeToSendList,
} from "./data";
import { Space, DatePicker } from "tdesign-vue-next";
import { SendStatus } from "./enums";

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
      key: index + Date.now(),
      class: { "button1": true, "selected": p.name + p.resList[0]?.url === currentAnimeInfo.value.name + currentAnimeInfo.value.resList[0]?.url },
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
      currentAnimeInfo.value.resList.map((item, i) => {
        return h("li", { key: i + Date.now() }, [
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
        style: "margin-bottom: 0px;",
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
      type: "text", placeholder: "title", value: currentAnimeInfo.value.name,
      onChange: (e: any) => {
        currentAnimeInfo.value.name = e.target.value;
      }
    }),
    h("p", { class: "title" }, "中文标题"),
    h("input", {
      type: "text", placeholder: "CN title", value: currentAnimeInfo.value.CN_name,
      onChange: (e: any) => {
        currentAnimeInfo.value.CN_name = e.target.value;
      }
    }),
    h("p", { class: "title" }, "描述"),
    h("textarea", {
      placeholder: "description", value: currentAnimeInfo.value.description,
      onChange: (e: any) => {
        currentAnimeInfo.value.description = e.target.value;
      }
    }),
    h("p", { class: "title" }, "标签"),
    h("ul", { class: "tag-box" }, [
      ...currentAnimeInfo.value.tags.map(p => {
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
    animeTags.length && currentAnimeInfo.value.tags.length ? h("hr") : null,
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
        type: "text", style: "max-width: 100%;margin-bottom: 0px;", placeholder: "tag",
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
      h(Space, {
        key: currentAnimeInfo.value.name + currentAnimeInfo.value.CN_name,
        direction: 'vertical'
      }, {
        default: () => [
          h(DatePicker, {
            enableTimePicker: true,
            allowInput: true,
            clearable: true,
            needConfirm: false,
            value: currentAnimeInfo.value.timedSend,
            onChange(value, context) {
              currentAnimeInfo.value.timedSend = value as string;
            },
          })
        ]
      }),
      h("button", { class: "button1", onClick: () => addAnimeToSendList(currentAnimeInfo.value) }, "添加到队列"),
    ]),
    h("section", { class: "flex-box" }, [
      h("button", {
        class: "button1 button-send", style: {
          color: statusConfig[currentAnimeInfo.value.sendStatus].color,
          "border-color": statusConfig[currentAnimeInfo.value.sendStatus].color,
        },
        onClick: statusConfig[currentAnimeInfo.value.sendStatus].disabled ? undefined : () => sendTgMessage(currentAnimeInfo.value),
        disabled: statusConfig[currentAnimeInfo.value.sendStatus].disabled,
      }, `${statusConfig[currentAnimeInfo.value.sendStatus].text}`),
      h("button", {
        class: "button1", onClick: () => {
          (document.getElementById("dialog-sendList") as HTMLDialogElement).showModal();
        }
      }, "队列"),
      h("button", {
        class: "button1", onClick: () => {
          (document.getElementById("dialog-config") as HTMLDialogElement).showModal();
        }
      }, "配置")
    ]),

    h("dialog", {
      id: "dialog-config", onClick: closeDialog
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
    ]),
    h("dialog", {
      id: "dialog-sendList", onClick: closeDialog
    }, [
      h("ul",
        animeSendList.map((item, index) => {
          return h("li", { key: index + item.name }, [
            h("p", { class: "title" }, item.name),
            h("div", { class: "flex-box" }, [

              h("img", {
                src: item.resList[0]?.imgShowUrl,
                tabindex: "-1",
                autofocus: true,
                style: "outline: none;"
              }),
              h("div", [
                h(Space, {
                  direction: 'vertical',
                }, {
                  default: () => [
                    h(DatePicker, {
                      enableTimePicker: true,
                      allowInput: true,
                      clearable: true,
                      needConfirm: false,
                      value: item.timedSend,
                      popupProps: {
                        attach: '#dialog-sendList',
                      },
                      onChange: (value) => {
                        item.timedSend = value as string;
                      },
                    })
                  ]
                }),
                h("div", { class: "flex-box" }, [
                  h("button", {
                    class: "button1 button-send", style: { color: statusConfig[item.sendStatus].color, "border-color": statusConfig[item.sendStatus].color },
                    onClick: statusConfig[item.sendStatus].disabled ? undefined : () => sendTgMessage(item),
                    disabled: statusConfig[item.sendStatus].disabled,
                  }, `${statusConfig[item.sendStatus].text}`),
                  h("button", {
                    class: "button1",
                    disabled: statusConfig[item.sendStatus].disabled,
                    onClick: () => {
                      modifyAnimeInfo(item);
                      (document.getElementById("dialog-sendList") as HTMLDialogElement).close();
                    }
                  }, "修改"),
                  h("button", { class: "button1", onClick: () => removeAnimeInfo(item) }, "删除"),
                ])
              ])
            ]),
          ]);
        }))
    ])
  ]);
};

const closeDialog = (e: PointerEvent) => {
  const rect = (e.currentTarget as HTMLDialogElement).getBoundingClientRect();
  if (e.clientX < rect.left ||
    e.clientX > rect.right ||
    e.clientY < rect.top ||
    e.clientY > rect.bottom) {
    (e.currentTarget as HTMLDialogElement).close();
  }
};

const statusConfig: Record<SendStatus, { text: string; color: string | undefined; disabled: boolean; }> = {
  [SendStatus.Pending]: { text: '发送', color: undefined, disabled: false },
  [SendStatus.Sending]: { text: '发送中...', color: '#999', disabled: true },
  [SendStatus.Success]: { text: '已发送', color: '#67C23A', disabled: true },
  [SendStatus.Failed]: { text: '重新发送', color: '#F56C6C', disabled: false }
};