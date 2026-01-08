import $ from "jquery";

export function ensureCursor(userId) {
  let $el = $(`#cursor-${userId}`);
  if ($el.length === 0) {
    $el = $("<div/>", {
      id: `cursor-${userId}`,
      class: "remote-cursor pointer-events-none fixed z-50",
    })
      .css({ width: 10, height: 10, borderRadius: 5, position: "absolute" })
      .appendTo("body");
  }
  return $el;
}

export function updateCursor(userId, x, y) {
  ensureCursor(userId).css({ left: x, top: y });
}
