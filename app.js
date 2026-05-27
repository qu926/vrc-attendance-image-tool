(function () {
  "use strict";

  var STORAGE_KEY = "vrcAttendanceImageTool.state.v6";
  var DRAFT_KEY = "vrcAttendanceImageTool.draft.v6";
  var EXPORT_VERSION = 2;
  var BUILTIN_MEMBERS = [
    { id: "builtin-mitsuru", name: "海釣", imageDataUrl: "assets/members/mitsuru.png" },
    { id: "builtin-justaway", name: "ジャスタウェイ", imageDataUrl: "assets/members/justaway.png" },
    { id: "builtin-kujo-rin", name: "九条凛", imageDataUrl: "assets/members/kujo-rin.png" },
    { id: "builtin-daito", name: "大都", imageDataUrl: "assets/members/daito.png" },
    { id: "builtin-romiland", name: "ロミランド", imageDataUrl: "assets/members/romiland.png" },
    { id: "builtin-akatsuki-minato", name: "暁湊", imageDataUrl: "assets/members/akatsuki-minato.png" },
    { id: "builtin-sumeragi-mikado", name: "皇ミカド", imageDataUrl: "assets/members/sumeragi-mikado.png" },
    { id: "builtin-mikage-hallow", name: "御影破狼", imageDataUrl: "assets/members/mikage-hallow.png" },
    { id: "builtin-solne", name: "ソルネ", imageDataUrl: "assets/members/solne.png" },
    { id: "builtin-unchi", name: "運誓", imageDataUrl: "assets/members/unchi.png" },
    { id: "builtin-futaba-fukurou", name: "弐刃 梟", imageDataUrl: "assets/members/futaba-fukurou.png" },
    { id: "builtin-yozora-kirito", name: "夜空霧斗", imageDataUrl: "assets/members/yozora-kirito.png" },
    { id: "builtin-aqua", name: "アクア", imageDataUrl: "assets/members/aqua.png" },
    { id: "builtin-kai-shirato", name: "魁 白兎", imageDataUrl: "assets/members/kai-shirato.png" },
    { id: "builtin-sendou-kaguya", name: "千堂 神弥", imageDataUrl: "assets/members/sendou-kaguya.png" },
    { id: "builtin-jey", name: "じぇい", imageDataUrl: "assets/members/jey.png" },
    { id: "builtin-setoken", name: "せとけん", imageDataUrl: "assets/members/setoken.png" },
    { id: "builtin-hatsune-miku", name: "みく", imageDataUrl: "assets/members/hatsune-miku.png" },
    { id: "builtin-rutile", name: "ルチル", imageDataUrl: "assets/members/rutile.png" },
    { id: "builtin-kuga-toko", name: "久我とこ", imageDataUrl: "assets/members/kuga-toko.png" }
  ];

  var requiredIds = [
    "titleInput",
    "subtitleInput",
    "dateInput",
    "noteInput",
    "templateSelect",
    "canvasSizeSelect",
    "layoutSelect",
    "backgroundInput",
    "accentColor",
    "addPeopleInput",
    "importJsonInput",
    "peopleGrid",
    "searchInput",
    "instance1List",
    "instance2List",
    "unassignedList",
    "previewCanvas",
    "downloadBtn",
    "downloadInstance1Btn",
    "downloadInstance2Btn",
    "resetAssignmentBtn",
    "exportJsonBtn",
    "clearAllBtn",
    "sampleBtn",
    "saveDraftBtn",
    "loadDraftBtn",
    "statusMessage"
  ];

  var el = {};
  var imageCache = {};
  var renderToken = 0;
  var saveTimer = 0;
  var previewTimer = 0;
  var state = createDefaultState();

  function createDefaultState() {
    return {
      meta: {
        title: "VRCイベント 出席メンバー",
        subtitle: "Group Join / Friends+",
        date: "",
        note: "",
        template: "night",
        canvasSize: "1600x900",
        layout: "instance-poster",
        accentColor: "#d7b15a"
      },
      background: null,
      people: createBuiltinMembers(),
      builtinsDisabled: false
    };
  }

  function createEmptyState() {
    var emptyState = createDefaultState();
    emptyState.background = null;
    emptyState.people = [];
    emptyState.builtinsDisabled = true;
    return emptyState;
  }

  function createBuiltinMembers() {
    return BUILTIN_MEMBERS.map(function (member) {
      return {
        id: member.id,
        name: member.name,
        imageDataUrl: member.imageDataUrl,
        assignment: "unassigned",
        builtin: true
      };
    });
  }

  function init() {
    cacheElements();
    state = normalizeState(loadFromStorage(STORAGE_KEY) || createDefaultState());
    bindControls();
    syncControlsFromState();
    renderAll("準備できました。画像を追加してインスタンスを選んでください。", "success");
  }

  function cacheElements() {
    requiredIds.forEach(function (id) {
      el[id] = document.getElementById(id);
    });
  }

  function bindControls() {
    bindMetaInput(el.titleInput, "title");
    bindMetaInput(el.subtitleInput, "subtitle");
    bindMetaInput(el.dateInput, "date");
    bindMetaInput(el.noteInput, "note");
    bindMetaInput(el.accentColor, "accentColor");
    bindMetaSelect(el.templateSelect, "template");
    bindMetaSelect(el.canvasSizeSelect, "canvasSize");
    bindMetaSelect(el.layoutSelect, "layout");

    if (el.searchInput) {
      el.searchInput.addEventListener("input", function () {
        renderLists();
      });
    }

    if (el.addPeopleInput) {
      el.addPeopleInput.addEventListener("change", function (event) {
        addPeopleFromFiles(event.target.files);
        event.target.value = "";
      });
    }

    if (el.backgroundInput) {
      el.backgroundInput.addEventListener("change", function (event) {
        setBackgroundFromFile(event.target.files && event.target.files[0]);
        event.target.value = "";
      });
    }

    if (el.importJsonInput) {
      el.importJsonInput.addEventListener("change", function (event) {
        importJsonFile(event.target.files && event.target.files[0]);
        event.target.value = "";
      });
    }

    bindDropTarget(el.instance1List, "instance1");
    bindDropTarget(el.instance2List, "instance2");
    bindDropTarget(el.unassignedList, "unassigned");

    onClick(el.downloadBtn, downloadPng);
    onClick(el.downloadInstance1Btn, function () {
      downloadInstancePng("instance1");
    });
    onClick(el.downloadInstance2Btn, function () {
      downloadInstancePng("instance2");
    });
    onClick(el.resetAssignmentBtn, resetAssignments);
    onClick(el.exportJsonBtn, exportJson);
    onClick(el.clearAllBtn, clearAllData);
    onClick(el.sampleBtn, addSamplePeople);
    onClick(el.saveDraftBtn, saveDraft);
    onClick(el.loadDraftBtn, loadDraft);
  }

  function bindMetaInput(input, key) {
    if (!input) return;
    input.addEventListener("input", function () {
      state.meta[key] = input.value || "";
      scheduleSave();
      renderPreviewSoon();
    });
  }

  function bindMetaSelect(input, key) {
    if (!input) return;
    input.addEventListener("change", function () {
      state.meta[key] = input.value || "";
      scheduleSave();
      renderPreviewSoon();
    });
  }

  function onClick(node, handler) {
    if (!node) return;
    node.addEventListener("click", function (event) {
      event.preventDefault();
      handler();
    });
  }

  function bindDropTarget(container, assignment) {
    if (!container) return;

    container.addEventListener("dragover", function (event) {
      event.preventDefault();
      container.classList.add("drag-over");
    });

    container.addEventListener("dragleave", function () {
      container.classList.remove("drag-over");
    });

    container.addEventListener("drop", function (event) {
      event.preventDefault();
      container.classList.remove("drag-over");
      var id = event.dataTransfer && event.dataTransfer.getData("text/plain");
      if (id) {
        movePerson(id, assignment);
      }
    });
  }

  function syncControlsFromState() {
    setValue(el.titleInput, state.meta.title);
    setValue(el.subtitleInput, state.meta.subtitle);
    setValue(el.dateInput, state.meta.date);
    setValue(el.noteInput, state.meta.note);
    setValue(el.templateSelect, state.meta.template);
    setValue(el.canvasSizeSelect, state.meta.canvasSize);
    setValue(el.layoutSelect, state.meta.layout);
    setValue(el.accentColor, state.meta.accentColor);
  }

  function setValue(node, value) {
    if (node) node.value = value || "";
  }

  function renderAll(message, kind) {
    renderLists();
    renderPreviewSoon();
    scheduleSave();
    if (message) setStatus(message, kind);
  }

  function renderLists() {
    renderPeopleGrid();
    renderAssignmentList(el.instance1List, "instance1");
    renderAssignmentList(el.instance2List, "instance2");
    renderAssignmentList(el.unassignedList, "unassigned");
    updateCountBadges();
  }

  function renderPeopleGrid() {
    if (!el.peopleGrid) return;
    clearNode(el.peopleGrid);

    var people = filteredPeople();
    if (!people.length) {
      el.peopleGrid.appendChild(emptyMessage(state.people.length ? "検索条件に合うメンバーがいません。" : "まだメンバー画像がありません。"));
      return;
    }

    people.forEach(function (person) {
      el.peopleGrid.appendChild(createPersonCard(person));
    });
  }

  function createPersonCard(person) {
    var card = document.createElement("article");
    card.className = "person-card";
    card.draggable = true;
    card.addEventListener("dragstart", function (event) {
      if (event.dataTransfer) {
        event.dataTransfer.setData("text/plain", person.id);
        event.dataTransfer.effectAllowed = "move";
      }
    });

    var img = document.createElement("img");
    img.className = "person-card__image";
    img.alt = person.name || "メンバー画像";
    img.src = person.imageDataUrl || "";
    img.onerror = function () {
      img.removeAttribute("src");
    };

    var nameInput = document.createElement("input");
    nameInput.className = "person-card__name";
    nameInput.type = "text";
    nameInput.value = person.name || "";
    nameInput.placeholder = "名前";
    nameInput.setAttribute("aria-label", "メンバー名");
    nameInput.addEventListener("input", function () {
      person.name = nameInput.value;
      scheduleSave();
      renderPreviewSoon();
      renderAssignmentListsOnly();
    });

    var assignment = document.createElement("div");
    assignment.className = "person-card__assignment";
    assignment.textContent = assignmentLabel(person.assignment);

    var actions = document.createElement("div");
    actions.className = "person-card__actions";
    actions.appendChild(actionButton("未", "未配置へ移動", function () {
      movePerson(person.id, "unassigned");
    }, false, person.assignment === "unassigned"));
    actions.appendChild(actionButton("1", "インスタンス1へ移動", function () {
      movePerson(person.id, "instance1");
    }, false, person.assignment === "instance1"));
    actions.appendChild(actionButton("2", "インスタンス2へ移動", function () {
      movePerson(person.id, "instance2");
    }, false, person.assignment === "instance2"));
    actions.appendChild(actionButton("↑", "掲載順を上げる", function () {
      reorderPerson(person.id, -1);
    }, false, false, !canReorderPerson(person.id, -1)));
    actions.appendChild(actionButton("↓", "掲載順を下げる", function () {
      reorderPerson(person.id, 1);
    }, false, false, !canReorderPerson(person.id, 1)));
    actions.appendChild(actionButton("削除", "削除", function () {
      removePerson(person.id);
    }, true));

    card.appendChild(img);
    card.appendChild(nameInput);
    card.appendChild(assignment);
    card.appendChild(actions);
    return card;
  }

  function renderAssignmentListsOnly() {
    renderAssignmentList(el.instance1List, "instance1");
    renderAssignmentList(el.instance2List, "instance2");
    renderAssignmentList(el.unassignedList, "unassigned");
    updateCountBadges();
  }

  function renderAssignmentList(container, assignment) {
    if (!container) return;
    clearNode(container);

    var people = filteredPeople().filter(function (person) {
      return person.assignment === assignment;
    });

    if (!people.length) {
      container.appendChild(listEmptyMessage(assignment));
      return;
    }

    people.forEach(function (person) {
      container.appendChild(createAssignmentRow(person, assignment));
    });
  }

  function createAssignmentRow(person, currentAssignment) {
    var item = document.createElement("li");
    item.className = "assignment-row";
    item.draggable = true;
    item.addEventListener("dragstart", function (event) {
      if (event.dataTransfer) {
        event.dataTransfer.setData("text/plain", person.id);
        event.dataTransfer.effectAllowed = "move";
      }
    });

    var img = document.createElement("img");
    img.className = "assignment-row__image";
    img.alt = person.name || "メンバー画像";
    img.src = person.imageDataUrl || "";
    img.onerror = function () {
      img.removeAttribute("src");
    };

    var name = document.createElement("span");
    name.className = "assignment-row__name";
    name.textContent = person.name || "名前未設定";

    var actions = document.createElement("div");
    actions.className = "assignment-row__actions";
    if (currentAssignment !== "unassigned") {
      actions.appendChild(actionButton("未", "未配置へ移動", function () {
        movePerson(person.id, "unassigned");
      }));
    }
    if (currentAssignment !== "instance1") {
      actions.appendChild(actionButton("1", "インスタンス1へ移動", function () {
        movePerson(person.id, "instance1");
      }));
    }
    if (currentAssignment !== "instance2") {
      actions.appendChild(actionButton("2", "インスタンス2へ移動", function () {
        movePerson(person.id, "instance2");
      }));
    }
    actions.appendChild(actionButton("↑", "この一覧で掲載順を上げる", function () {
      reorderPerson(person.id, -1, currentAssignment);
    }, false, false, !canReorderPerson(person.id, -1, currentAssignment)));
    actions.appendChild(actionButton("↓", "この一覧で掲載順を下げる", function () {
      reorderPerson(person.id, 1, currentAssignment);
    }, false, false, !canReorderPerson(person.id, 1, currentAssignment)));

    item.appendChild(img);
    item.appendChild(name);
    item.appendChild(actions);
    return item;
  }

  function actionButton(label, title, handler, danger, selected, disabled) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = danger ? "mini-btn is-danger" : "mini-btn";
    if (selected) {
      button.classList.add("is-selected");
      button.setAttribute("aria-pressed", "true");
    } else {
      button.setAttribute("aria-pressed", "false");
    }
    button.textContent = label;
    button.title = title || label;
    button.setAttribute("aria-label", title || label);
    if (disabled) {
      button.disabled = true;
    } else {
      button.addEventListener("click", handler);
    }
    return button;
  }

  function emptyMessage(text) {
    var node = document.createElement("div");
    node.className = "empty-message";
    node.textContent = text;
    return node;
  }

  function listEmptyMessage(assignment) {
    var node = document.createElement("li");
    node.className = "empty-state";
    if (assignment === "instance1") node.textContent = "ここに1インスタンスの参加者を入れます。";
    else if (assignment === "instance2") node.textContent = "ここに2インスタンスの参加者を入れます。";
    else node.textContent = "追加したメンバーは最初ここに入ります。";
    return node;
  }

  function clearNode(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function filteredPeople() {
    var query = (el.searchInput && el.searchInput.value ? el.searchInput.value : "").trim().toLowerCase();
    if (!query) return state.people.slice();
    return state.people.filter(function (person) {
      return String(person.name || "").toLowerCase().indexOf(query) !== -1;
    });
  }

  function updateCountBadges() {
    updateBadge("peopleGrid", state.people.length);
    updateBadge("instance1List", countByAssignment("instance1"));
    updateBadge("instance2List", countByAssignment("instance2"));
    updateBadge("unassignedList", countByAssignment("unassigned"));
  }

  function updateBadge(target, count) {
    var badge = document.querySelector('[data-count-for="' + target + '"]');
    if (badge) badge.textContent = count + "名";
  }

  function countByAssignment(assignment) {
    return state.people.filter(function (person) {
      return person.assignment === assignment;
    }).length;
  }

  function assignmentLabel(value) {
    if (value === "instance1") return "インスタンス 1";
    if (value === "instance2") return "インスタンス 2";
    return "未配置";
  }

  function movePerson(id, assignment) {
    var person = findPerson(id);
    if (!person) return;
    person.assignment = normalizeAssignment(assignment);
    renderAll((person.name || "メンバー") + "を" + assignmentLabel(person.assignment) + "へ移動しました。", "success");
  }

  function reorderPerson(id, direction, assignmentScope) {
    var person = findPerson(id);
    var currentIndex = state.people.findIndex(function (item) {
      return item.id === id;
    });
    var indices = orderIndices(assignmentScope);
    var position = indices.indexOf(currentIndex);
    var nextPosition = position + direction;
    if (!person || position < 0 || nextPosition < 0 || nextPosition >= indices.length) return;

    var fromIndex = indices[position];
    var toIndex = indices[nextPosition];
    var target = state.people[toIndex];
    state.people[toIndex] = state.people[fromIndex];
    state.people[fromIndex] = target;
    renderAll((person.name || "メンバー") + "の掲載順を変更しました。", "success");
  }

  function canReorderPerson(id, direction, assignmentScope) {
    var currentIndex = state.people.findIndex(function (person) {
      return person.id === id;
    });
    if (currentIndex < 0) return false;
    var indices = orderIndices(assignmentScope);
    var position = indices.indexOf(currentIndex);
    var nextPosition = position + direction;
    return position >= 0 && nextPosition >= 0 && nextPosition < indices.length;
  }

  function orderIndices(assignmentScope) {
    var normalizedScope = assignmentScope ? normalizeAssignment(assignmentScope) : "";
    var indices = [];
    state.people.forEach(function (person, index) {
      if (!normalizedScope || person.assignment === normalizedScope) {
        indices.push(index);
      }
    });
    return indices;
  }

  function removePerson(id) {
    var person = findPerson(id);
    state.people = state.people.filter(function (item) {
      return item.id !== id;
    });
    renderAll((person && person.name ? person.name : "メンバー") + "を削除しました。", "success");
  }

  function findPerson(id) {
    for (var i = 0; i < state.people.length; i += 1) {
      if (state.people[i].id === id) return state.people[i];
    }
    return null;
  }

  function addPeopleFromFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []).filter(function (file) {
      return file && /^image\//.test(file.type || "");
    });

    if (!files.length) {
      setStatus("画像ファイルを選択してください。", "error");
      return;
    }

    Promise.all(files.map(readPersonImageFile)).then(function (people) {
      people.forEach(function (person) {
        state.people.push(person);
      });
      renderAll(people.length + "名を追加しました。", "success");
    }).catch(function () {
      setStatus("画像の読み込みに失敗しました。", "error");
    });
  }

  function readPersonImageFile(file) {
    return readFileAsDataUrl(file).then(function (dataUrl) {
      return {
        id: createId(),
        name: stripExtension(file.name || "メンバー"),
        imageDataUrl: dataUrl,
        assignment: "unassigned"
      };
    });
  }

  function setBackgroundFromFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type || "")) {
      setStatus("背景には画像ファイルを選択してください。", "error");
      return;
    }

    readFileAsDataUrl(file).then(function (dataUrl) {
      state.background = {
        name: file.name || "background",
        dataUrl: dataUrl
      };
      renderAll("背景画像を設定しました。", "success");
    }).catch(function () {
      setStatus("背景画像の読み込みに失敗しました。", "error");
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (!file || typeof FileReader === "undefined") {
        reject(new Error("FileReader is not available"));
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ""));
      };
      reader.onerror = function () {
        reject(reader.error || new Error("File read failed"));
      };
      reader.readAsDataURL(file);
    });
  }

  function stripExtension(name) {
    return String(name || "").replace(/\.[^/.\\]+$/, "") || "メンバー";
  }

  function resetAssignments() {
    state.people.forEach(function (person) {
      person.assignment = "unassigned";
    });
    renderAll("配置をリセットしました。", "success");
  }

  function clearAllData() {
    var confirmed = typeof window.confirm !== "function" || window.confirm("すべてのメンバー、背景、設定を削除します。よろしいですか？");
    if (!confirmed) return;
    state = createEmptyState();
    syncControlsFromState();
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      // localStorage may be blocked in some browsers.
    }
    saveToStorage(STORAGE_KEY, toExportState());
    renderAll("すべてのメンバー、背景、設定をクリアしました。", "success");
  }

  function addSamplePeople() {
    var samples = [
      ["Aoi", "#65d7ff", "#17324d"],
      ["Rin", "#ff77bb", "#4a243d"],
      ["Sora", "#92e6a7", "#203d2a"],
      ["Mika", "#ffd166", "#4a3617"],
      ["Yuki", "#b49cff", "#30285f"],
      ["Nana", "#ff9f6e", "#4b2b1d"],
      ["Haru", "#74f0d2", "#1d403b"],
      ["Kohaku", "#dce5ff", "#283142"]
    ];

    samples.forEach(function (sample, index) {
      state.people.push({
        id: createId(),
        name: sample[0],
        imageDataUrl: createAvatarDataUrl(sample[0], sample[1], sample[2], index),
        assignment: index < 4 ? "instance1" : "instance2"
      });
    });
    renderAll("サンプルメンバーを追加しました。", "success");
  }

  function createAvatarDataUrl(name, color, bg, index) {
    var canvas = document.createElement("canvas");
    var size = 512;
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext("2d");
    if (!ctx) return "";

    var gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, bg);
    gradient.addColorStop(1, color);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((index % 5 - 2) * 0.08);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    roundRect(ctx, -170, -160, 340, 340, 70);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.88)";
    circle(ctx, 256, 205, 74);
    ctx.fill();
    roundRect(ctx, 128, 292, 256, 132, 66);
    ctx.fill();

    ctx.fillStyle = bg;
    circle(ctx, 230, 202, 10);
    circle(ctx, 282, 202, 10);
    ctx.fill();
    ctx.strokeStyle = bg;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(232, 238);
    ctx.quadraticCurveTo(256, 258, 282, 238);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 72px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(name || "?").charAt(0).toUpperCase(), 256, 78);

    try {
      return canvas.toDataURL("image/png");
    } catch (error) {
      return "";
    }
  }

  function renderPreviewSoon() {
    if (previewTimer) window.cancelAnimationFrame(previewTimer);
    previewTimer = window.requestAnimationFrame(function () {
      previewTimer = 0;
      drawPreview();
    });
  }

  function drawPreview() {
    if (!el.previewCanvas) return Promise.resolve();
    var canvas = el.previewCanvas;
    var ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return Promise.resolve();

    var size = parseCanvasSize(state.meta.canvasSize);
    if (canvas.width !== size.width) canvas.width = size.width;
    if (canvas.height !== size.height) canvas.height = size.height;
    updatePreviewAspect(size.width, size.height);

    var token = ++renderToken;
    var backgroundPromise = state.background && state.background.dataUrl
      ? loadImage(state.background.dataUrl).catch(function () { return null; })
      : Promise.resolve(null);

    var groups = {
      instance1: state.people.filter(function (person) { return person.assignment === "instance1"; }),
      instance2: state.people.filter(function (person) { return person.assignment === "instance2"; })
    };

    var imagePromises = groups.instance1.concat(groups.instance2).map(function (person) {
      if (!person.imageDataUrl) return Promise.resolve({ id: person.id, image: null });
      return loadImage(person.imageDataUrl).then(function (image) {
        return { id: person.id, image: image };
      }).catch(function () {
        return { id: person.id, image: null };
      });
    });

    return Promise.all([backgroundPromise].concat(imagePromises)).then(function (results) {
      if (token !== renderToken) return;
      var backgroundImage = results[0];
      var imageMap = {};
      results.slice(1).forEach(function (item) {
        if (item) imageMap[item.id] = item.image;
      });
      paintCanvas(ctx, canvas, backgroundImage, imageMap, groups);
    }).catch(function () {
      paintCanvas(ctx, canvas, null, {}, groups);
    });
  }

  function updatePreviewAspect(width, height) {
    var frame = el.previewCanvas && el.previewCanvas.parentElement;
    if (frame) frame.style.setProperty("--preview-aspect-ratio", width + " / " + height);
  }

  function paintCanvas(ctx, canvas, backgroundImage, imageMap, groups) {
    var width = canvas.width;
    var height = canvas.height;
    var template = getTemplate();
    var accent = state.meta.accentColor || "#1f8a70";
    var layout = String(state.meta.layout || "instance-poster").toLowerCase();

    drawBackground(ctx, width, height, backgroundImage, template, accent);

    if (layout === "instance-poster") {
      drawInstancePosterLayout(ctx, width, height, groups.instance1, imageMap, template, accent, "第1インスタンス");
      return;
    }

    drawHeader(ctx, width, height, template, accent);

    if (layout === "stacked") {
      drawStackedLayout(ctx, width, height, groups, imageMap, template, accent);
    } else if (layout === "compact") {
      drawCompactLayout(ctx, width, height, groups, imageMap, template, accent);
    } else {
      drawTwoColumnLayout(ctx, width, height, groups, imageMap, template, accent);
    }

    drawFooter(ctx, width, height, template);
  }

  function drawBackground(ctx, width, height, backgroundImage, template, accent) {
    ctx.clearRect(0, 0, width, height);
    if (backgroundImage) {
      drawCoverImage(ctx, backgroundImage, 0, 0, width, height);
      ctx.fillStyle = template.overlay;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    var gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, template.bg1);
    gradient.addColorStop(0.58, template.bg2);
    gradient.addColorStop(1, template.bg3);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = template.patternAlpha;
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(2, width * 0.003);
    for (var i = -height; i < width; i += Math.max(70, width * 0.08)) {
      ctx.beginPath();
      ctx.moveTo(i, height);
      ctx.lineTo(i + height, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHeader(ctx, width, height, template, accent) {
    var margin = getMargin(width, height);
    var title = state.meta.title || "VRCイベント 出席メンバー";
    var subtitleParts = [];
    if (state.meta.subtitle) subtitleParts.push(state.meta.subtitle);
    if (state.meta.date) subtitleParts.push(formatDateLabel(state.meta.date));
    var subtitle = subtitleParts.join("  /  ");

    ctx.fillStyle = accent;
    roundRect(ctx, margin, margin * 0.72, clamp(width * 0.11, 84, 168), clamp(height * 0.012, 8, 14), 999);
    ctx.fill();

    ctx.fillStyle = template.text;
    fitText(ctx, title, margin, margin * 0.96, width - margin * 2, clamp(width * 0.052, 38, 88), 850, "left");

    if (subtitle) {
      ctx.fillStyle = template.subtleText;
      fitText(ctx, subtitle, margin, margin * 0.96 + clamp(width * 0.065, 52, 98), width - margin * 2, clamp(width * 0.022, 20, 36), 650, "left");
    }
  }

  function drawFooter(ctx, width, height, template) {
    var note = state.meta.note || "";
    if (!note) return;
    var margin = getMargin(width, height);
    ctx.fillStyle = template.subtleText;
    drawWrappedText(ctx, note, margin, height - margin * 0.95, width - margin * 2, clamp(width * 0.017, 16, 26), 1.35, 2, "bottom");
  }

  function drawTwoColumnLayout(ctx, width, height, groups, imageMap, template, accent) {
    var margin = getMargin(width, height);
    var top = margin + clamp(width * 0.122, 116, 184);
    var bottom = margin + (state.meta.note ? clamp(width * 0.042, 42, 72) : 0);
    var gap = clamp(width * 0.024, 22, 44);
    var panelW = (width - margin * 2 - gap) / 2;
    var panelH = height - top - bottom;

    drawColumn(ctx, "インスタンス 1", groups.instance1, imageMap, margin, top, panelW, panelH, template, accent);
    drawColumn(ctx, "インスタンス 2", groups.instance2, imageMap, margin + panelW + gap, top, panelW, panelH, template, accent);
  }

  function drawStackedLayout(ctx, width, height, groups, imageMap, template, accent) {
    var margin = getMargin(width, height);
    var top = margin + clamp(width * 0.122, 116, 184);
    var bottom = margin + (state.meta.note ? clamp(width * 0.042, 42, 72) : 0);
    var gap = clamp(height * 0.025, 20, 38);
    var panelW = width - margin * 2;
    var panelH = (height - top - bottom - gap) / 2;

    drawColumn(ctx, "インスタンス 1", groups.instance1, imageMap, margin, top, panelW, panelH, template, accent);
    drawColumn(ctx, "インスタンス 2", groups.instance2, imageMap, margin, top + panelH + gap, panelW, panelH, template, accent);
  }

  function drawCompactLayout(ctx, width, height, groups, imageMap, template, accent) {
    var margin = getMargin(width, height);
    var top = margin + clamp(width * 0.112, 108, 168);
    var bottom = margin + (state.meta.note ? clamp(width * 0.04, 40, 66) : 0);
    var panelW = width - margin * 2;
    var panelH = height - top - bottom;
    var all = groups.instance1.map(function (person) {
      return { person: person, tag: "1" };
    }).concat(groups.instance2.map(function (person) {
      return { person: person, tag: "2" };
    }));

    drawPanel(ctx, margin, top, panelW, panelH, template, accent, "出席メンバー");
    drawAvatarGrid(ctx, all, imageMap, margin + panelW * 0.04, top + panelH * 0.15, panelW * 0.92, panelH * 0.78, template, accent);
  }

  function drawInstancePosterLayout(ctx, width, height, people, imageMap, template, accent, instanceTitle) {
    var margin = getMargin(width, height);
    var title = state.meta.title || "VRCイベント 出席メンバー";
    var subtitleParts = [];
    if (state.meta.subtitle) subtitleParts.push(state.meta.subtitle);
    if (state.meta.date) subtitleParts.push(formatDateLabel(state.meta.date));
    var subtitle = subtitleParts.join("  ×  ");
    var headerTop = margin * 0.52;
    var titleSize = clamp(width * 0.06, 48, 92);
    var instanceSize = clamp(width * 0.026, 25, 42);

    ctx.save();
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = Math.max(8, width * 0.008);
    ctx.fillStyle = template.text;
    fitText(ctx, title, margin, headerTop, width - margin * 2, titleSize, 850, "center");
    ctx.shadowBlur = 0;

    if (subtitle) {
      ctx.fillStyle = template.subtleText;
      fitText(ctx, subtitle, margin, headerTop + titleSize * 1.04, width - margin * 2, clamp(width * 0.018, 18, 28), 500, "center");
    }

    ctx.fillStyle = accent;
    roundRect(ctx, width / 2 - width * 0.11, headerTop + titleSize * 1.55, width * 0.22, Math.max(5, height * 0.008), 999);
    ctx.fill();

    ctx.fillStyle = template.text;
    fitText(ctx, instanceTitle, margin, headerTop + titleSize * 1.72, width - margin * 2, instanceSize, 850, "center");
    ctx.restore();

    var gridTop = headerTop + titleSize * 2.34;
    var footerReserve = state.meta.note ? clamp(height * 0.085, 54, 88) : clamp(height * 0.045, 34, 58);
    var gridHeight = height - gridTop - footerReserve;
    drawPosterCardGrid(ctx, people, imageMap, margin * 0.72, gridTop, width - margin * 1.44, gridHeight, template, accent);

    if (state.meta.note) {
      ctx.save();
      ctx.fillStyle = template.subtleText;
      drawWrappedText(ctx, state.meta.note, margin, height - margin * 0.82, width - margin * 2, clamp(width * 0.018, 17, 28), 1.34, 2, "bottom");
      ctx.restore();
    }
  }

  function drawPosterCardGrid(ctx, people, imageMap, x, y, width, height, template, accent) {
    if (!people.length) {
      ctx.save();
      ctx.fillStyle = template.mutedText;
      fitText(ctx, "このインスタンスの参加者を選んでください", x, y + height / 2 - 18, width, clamp(width * 0.026, 24, 38), 700, "center");
      ctx.restore();
      return;
    }

    var count = people.length;
    var rows = count <= 8 ? 1 : 2;
    if (count > 20) rows = 3;
    var columns = Math.ceil(count / rows);
    var gapX = clamp(width * 0.022, 18, 42);
    var gapY = clamp(height * 0.12 / rows, 24, 58);
    var cellW = (width - gapX * (columns - 1)) / columns;
    var cellH = (height - gapY * (rows - 1)) / rows;
    var nameSize = clamp(cellW * 0.18, 16, 30);
    var cardW = Math.min(cellW * 0.84, (cellH - nameSize * 1.8) / 1.58);
    var cardH = cardW * 1.58;
    var startX = x + (width - (cellW * columns + gapX * (columns - 1))) / 2;

    people.forEach(function (person, index) {
      var row = Math.floor(index / columns);
      var column = index % columns;
      var cellX = startX + column * (cellW + gapX);
      var cellY = y + row * (cellH + gapY);
      var cardX = cellX + (cellW - cardW) / 2;
      var cardY = cellY + Math.max(0, (cellH - cardH - nameSize * 1.65) / 2);
      drawPosterCard(ctx, person, imageMap[person.id], cardX, cardY, cardW, cardH, template, accent);
      drawPosterName(ctx, person.name || "名前未設定", cellX, cardY + cardH + nameSize * 0.32, cellW, nameSize, template);
    });
  }

  function drawPosterCard(ctx, person, image, x, y, width, height, template, accent) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.52)";
    ctx.shadowBlur = Math.max(8, width * 0.08);
    ctx.shadowOffsetY = Math.max(3, width * 0.04);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRect(ctx, x - width * 0.035, y - width * 0.035, width * 1.07, height * 1.07, Math.max(5, width * 0.04));
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRect(ctx, x, y, width, height, Math.max(4, width * 0.025));
    ctx.clip();
    if (image) {
      drawCoverImage(ctx, image, x, y, width, height);
    } else {
      drawPosterPlaceholder(ctx, person, x, y, width, height, template, accent);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.48)";
    ctx.lineWidth = Math.max(1, width * 0.014);
    roundRect(ctx, x, y, width, height, Math.max(4, width * 0.025));
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(2, width * 0.018);
    roundRect(ctx, x - width * 0.025, y - width * 0.025, width * 1.05, height * 1.05, Math.max(5, width * 0.035));
    ctx.stroke();
    ctx.restore();
  }

  function drawPosterPlaceholder(ctx, person, x, y, width, height, template, accent) {
    var gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(1, template.avatarBg);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    fitText(ctx, String(person.name || "?").charAt(0).toUpperCase(), x, y + height * 0.38, width, width * 0.42, 900, "center");
  }

  function drawPosterName(ctx, name, x, y, width, fontSize, template) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = Math.max(4, fontSize * 0.22);
    ctx.lineWidth = Math.max(2, fontSize * 0.12);
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.fillStyle = template.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    drawNameLines(ctx, name, x, y, width, fontSize, 2);
    ctx.restore();
  }

  function drawNameLines(ctx, name, x, y, width, fontSize, maxLines) {
    var rawLines = String(name || "").split(/\n+/).filter(Boolean);
    var lines = rawLines.length ? rawLines.slice(0, maxLines) : ["名前未設定"];
    var lineHeight = fontSize * 1.16;
    lines.forEach(function (line, index) {
      var text = line.trim();
      var size = fontSize;
      while (size > 10) {
        ctx.font = fontSpec(size, 850);
        if (ctx.measureText(text).width <= width) break;
        size -= 1;
      }
      ctx.strokeText(text, x + width / 2, y + lineHeight * index, width);
      ctx.fillText(text, x + width / 2, y + lineHeight * index, width);
    });
  }

  function drawColumn(ctx, label, people, imageMap, x, y, width, height, template, accent) {
    drawPanel(ctx, x, y, width, height, template, accent, label);
    drawAvatarGrid(
      ctx,
      people.map(function (person) { return { person: person, tag: "" }; }),
      imageMap,
      x + width * 0.055,
      y + height * 0.17,
      width * 0.89,
      height * 0.76,
      template,
      accent
    );
  }

  function drawPanel(ctx, x, y, width, height, template, accent, label) {
    ctx.save();
    ctx.fillStyle = template.panel;
    ctx.strokeStyle = template.stroke;
    ctx.lineWidth = Math.max(1, Math.round(width * 0.003));
    roundRect(ctx, x, y, width, height, Math.max(12, Math.min(width, height) * 0.035));
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    roundRect(ctx, x + width * 0.04, y + height * 0.055, width * 0.09, Math.max(5, height * 0.012), 999);
    ctx.fill();

    ctx.fillStyle = template.text;
    fitText(ctx, label, x + width * 0.04, y + height * 0.078, width * 0.82, clamp(width * 0.043, 22, 42), 850, "left");
    ctx.restore();
  }

  function drawAvatarGrid(ctx, items, imageMap, x, y, width, height, template, accent) {
    if (!items.length) {
      ctx.fillStyle = template.mutedText;
      fitText(ctx, "参加者未選択", x, y + height / 2 - 18, width, clamp(width * 0.04, 24, 38), 700, "center");
      return;
    }

    var count = items.length;
    var columns = chooseColumns(count, width, height);
    var rows = Math.ceil(count / columns);
    var gap = clamp(Math.min(width, height) * 0.035, 10, 26);
    var cellW = (width - gap * (columns - 1)) / columns;
    var cellH = (height - gap * (rows - 1)) / rows;
    var avatarSize = Math.min(cellW * 0.9, cellH * 0.72);
    var fontSize = clamp(Math.min(cellW * 0.15, cellH * 0.16), 13, 28);

    items.forEach(function (item, index) {
      var row = Math.floor(index / columns);
      var column = index % columns;
      var cellX = x + column * (cellW + gap);
      var cellY = y + row * (cellH + gap);
      var centerX = cellX + cellW / 2;
      var avatarX = centerX - avatarSize / 2;
      var avatarY = cellY + Math.max(0, (cellH - avatarSize - fontSize * 1.75) / 2);

      drawAvatar(ctx, item.person, imageMap[item.person.id], avatarX, avatarY, avatarSize, template, accent, item.tag);

      ctx.fillStyle = template.text;
      fitText(ctx, item.person.name || "名前未設定", cellX, avatarY + avatarSize + fontSize * 0.45, cellW, fontSize, 750, "center");
    });
  }

  function drawAvatar(ctx, person, image, x, y, size, template, accent, tag) {
    ctx.save();
    ctx.fillStyle = template.avatarBg;
    circle(ctx, x + size / 2, y + size / 2, size / 2);
    ctx.fill();

    ctx.save();
    circle(ctx, x + size / 2, y + size / 2, size / 2 - 2);
    ctx.clip();
    if (image) {
      drawCoverImage(ctx, image, x, y, size, size);
    } else {
      drawAvatarPlaceholder(ctx, person, x, y, size, template, accent);
    }
    ctx.restore();

    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(3, size * 0.045);
    circle(ctx, x + size / 2, y + size / 2, size / 2 - ctx.lineWidth / 2);
    ctx.stroke();

    if (tag) {
      var badge = size * 0.28;
      ctx.fillStyle = accent;
      circle(ctx, x + size * 0.82, y + size * 0.18, badge / 2);
      ctx.fill();
      ctx.fillStyle = "#06111f";
      fitText(ctx, tag, x + size * 0.82 - badge / 2, y + size * 0.18 - badge * 0.32, badge, badge * 0.62, 900, "center");
    }

    ctx.restore();
  }

  function drawAvatarPlaceholder(ctx, person, x, y, size, template, accent) {
    var gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(1, template.avatarBg);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    fitText(ctx, String(person.name || "?").charAt(0).toUpperCase(), x, y + size * 0.34, size, size * 0.34, 900, "center");
  }

  function chooseColumns(count, width, height) {
    var best = 1;
    var bestScore = Infinity;
    for (var columns = 1; columns <= Math.min(count, 8); columns += 1) {
      var rows = Math.ceil(count / columns);
      var cellW = width / columns;
      var cellH = height / rows;
      var ratio = cellW / Math.max(1, cellH);
      var score = Math.abs(ratio - 0.88) + rows * 0.02;
      if (score < bestScore) {
        best = columns;
        bestScore = score;
      }
    }
    return best;
  }

  function parseCanvasSize(value) {
    var match = String(value || "").match(/(\d{3,5})\s*x\s*(\d{3,5})/i);
    if (!match) return { width: 1600, height: 900 };
    return {
      width: clamp(parseInt(match[1], 10) || 1600, 640, 4000),
      height: clamp(parseInt(match[2], 10) || 900, 640, 4000)
    };
  }

  function getTemplate() {
    var value = String(state.meta.template || "clean").toLowerCase();
    if (value === "night") {
      return {
        bg1: "#07111f",
        bg2: "#172339",
        bg3: "#10323a",
        overlay: "rgba(5,10,18,0.66)",
        panel: "rgba(8,18,32,0.74)",
        stroke: "rgba(255,255,255,0.16)",
        text: "#f7fbff",
        subtleText: "rgba(247,251,255,0.74)",
        mutedText: "rgba(247,251,255,0.46)",
        avatarBg: "#172338",
        patternAlpha: 0.11
      };
    }
    if (value === "pop") {
      return {
        bg1: "#fff8ee",
        bg2: "#eaf6ff",
        bg3: "#fff0f5",
        overlay: "rgba(255,255,255,0.58)",
        panel: "rgba(255,255,255,0.78)",
        stroke: "rgba(36,52,72,0.16)",
        text: "#17202b",
        subtleText: "rgba(23,32,43,0.7)",
        mutedText: "rgba(23,32,43,0.45)",
        avatarBg: "#d8e6f7",
        patternAlpha: 0.13
      };
    }
    if (value === "minimal") {
      return {
        bg1: "#f8fafc",
        bg2: "#eef2f6",
        bg3: "#e7edf4",
        overlay: "rgba(248,250,252,0.72)",
        panel: "rgba(255,255,255,0.86)",
        stroke: "rgba(20,35,60,0.18)",
        text: "#17202b",
        subtleText: "rgba(23,32,43,0.68)",
        mutedText: "rgba(23,32,43,0.43)",
        avatarBg: "#dce5ed",
        patternAlpha: 0.06
      };
    }
    return {
      bg1: "#f7fbff",
      bg2: "#eef7f4",
      bg3: "#f5f7fb",
      overlay: "rgba(247,251,255,0.7)",
      panel: "rgba(255,255,255,0.82)",
      stroke: "rgba(20,35,60,0.16)",
      text: "#132033",
      subtleText: "rgba(19,32,51,0.72)",
      mutedText: "rgba(19,32,51,0.45)",
      avatarBg: "#d8e6f7",
      patternAlpha: 0.08
    };
  }

  function drawCoverImage(ctx, image, x, y, width, height) {
    var imageWidth = image.naturalWidth || image.width || 1;
    var imageHeight = image.naturalHeight || image.height || 1;
    var scale = Math.max(width / imageWidth, height / imageHeight);
    var drawWidth = imageWidth * scale;
    var drawHeight = imageHeight * scale;
    var drawX = x + (width - drawWidth) / 2;
    var drawY = y + (height - drawHeight) / 2;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  function loadImage(src) {
    if (!src) return Promise.reject(new Error("Missing image source"));
    if (imageCache[src]) return imageCache[src];
    imageCache[src] = new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        resolve(image);
      };
      image.onerror = function () {
        reject(new Error("Image load failed"));
      };
      image.src = src;
    });
    return imageCache[src];
  }

  function downloadPng() {
    if (!el.previewCanvas) {
      setStatus("プレビューが見つかりません。", "error");
      return;
    }

    drawPreview().then(function () {
      try {
        var link = document.createElement("a");
        link.download = buildFileName("vrc-attendance", "png");
        link.href = el.previewCanvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setStatus("PNGを保存しました。", "success");
      } catch (error) {
        setStatus("PNG保存に失敗しました。", "error");
      }
    });
  }

  function downloadInstancePng(assignment) {
    var normalized = normalizeAssignment(assignment);
    var people = state.people.filter(function (person) {
      return person.assignment === normalized;
    });
    if (!people.length) {
      setStatus(assignmentLabel(normalized) + "に参加者がいません。", "error");
      return;
    }

    var canvas = document.createElement("canvas");
    drawInstancePosterToCanvas(canvas, normalized).then(function () {
      try {
        var link = document.createElement("a");
        link.download = buildInstanceFileName(normalized, "png");
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setStatus(assignmentLabel(normalized) + "のPNGを保存しました。", "success");
      } catch (error) {
        setStatus(assignmentLabel(normalized) + "のPNG保存に失敗しました。", "error");
      }
    });
  }

  function drawInstancePosterToCanvas(canvas, assignment) {
    var size = parseCanvasSize(state.meta.canvasSize);
    canvas.width = size.width;
    canvas.height = size.height;
    var ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return Promise.resolve();

    var people = state.people.filter(function (person) {
      return person.assignment === assignment;
    });
    var backgroundPromise = state.background && state.background.dataUrl
      ? loadImage(state.background.dataUrl).catch(function () { return null; })
      : Promise.resolve(null);
    var imagePromises = people.map(function (person) {
      if (!person.imageDataUrl) return Promise.resolve({ id: person.id, image: null });
      return loadImage(person.imageDataUrl).then(function (image) {
        return { id: person.id, image: image };
      }).catch(function () {
        return { id: person.id, image: null };
      });
    });

    return Promise.all([backgroundPromise].concat(imagePromises)).then(function (results) {
      var template = getTemplate();
      var accent = state.meta.accentColor || "#d7b15a";
      var imageMap = {};
      results.slice(1).forEach(function (item) {
        if (item) imageMap[item.id] = item.image;
      });
      drawBackground(ctx, canvas.width, canvas.height, results[0], template, accent);
      drawInstancePosterLayout(ctx, canvas.width, canvas.height, people, imageMap, template, accent, assignment === "instance1" ? "第1インスタンス" : "第2インスタンス");
    });
  }

  function exportJson() {
    try {
      var payload = JSON.stringify(toExportState(), null, 2);
      var blob = new Blob([payload], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.download = buildFileName("vrc-attendance-data", "json");
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 500);
      setStatus("JSONを書き出しました。", "success");
    } catch (error) {
      setStatus("JSON書き出しに失敗しました。", "error");
    }
  }

  function importJsonFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result || "{}"));
        state = normalizeState(parsed);
        syncControlsFromState();
        renderAll("JSONを読み込みました。", "success");
      } catch (error) {
        setStatus("JSONの形式が正しくありません。", "error");
      }
    };
    reader.onerror = function () {
      setStatus("JSONファイルの読み込みに失敗しました。", "error");
    };
    reader.readAsText(file);
  }

  function saveDraft() {
    if (saveToStorage(DRAFT_KEY, toExportState())) {
      setStatus("下書きを保存しました。", "success");
    } else {
      setStatus("下書き保存に失敗しました。画像が大きすぎる可能性があります。", "error");
    }
  }

  function loadDraft() {
    var draft = loadFromStorage(DRAFT_KEY);
    if (!draft) {
      setStatus("保存済みの下書きがありません。", "error");
      return;
    }
    state = normalizeState(draft);
    syncControlsFromState();
    renderAll("下書きを読み込みました。", "success");
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(function () {
      saveToStorage(STORAGE_KEY, toExportState());
    }, 160);
  }

  function saveToStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadFromStorage(key) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function toExportState() {
    return {
      version: EXPORT_VERSION,
      savedAt: new Date().toISOString(),
      builtinsDisabled: Boolean(state.builtinsDisabled),
      meta: {
        title: state.meta.title || "",
        subtitle: state.meta.subtitle || "",
        date: state.meta.date || "",
        note: state.meta.note || "",
        template: state.meta.template || "night",
        canvasSize: state.meta.canvasSize || "1600x900",
        layout: state.meta.layout || "instance-poster",
        accentColor: state.meta.accentColor || "#d7b15a"
      },
      background: state.background ? {
        name: state.background.name || "background",
        dataUrl: state.background.dataUrl || ""
      } : null,
      people: state.people.map(function (person) {
        return {
          id: person.id || createId(),
          name: person.name || "",
          imageDataUrl: person.imageDataUrl || "",
          assignment: normalizeAssignment(person.assignment),
          builtin: Boolean(person.builtin)
        };
      })
    };
  }

  function normalizeState(input) {
    var base = createDefaultState();
    var data = input || {};
    if (Array.isArray(data)) data = { people: data };
    base.builtinsDisabled = data.builtinsDisabled === true;

    var meta = data.meta || {};
    base.meta.title = stringOr(meta.title, base.meta.title);
    base.meta.subtitle = stringOr(meta.subtitle, base.meta.subtitle);
    base.meta.date = stringOr(meta.date, base.meta.date);
    base.meta.note = stringOr(meta.note, base.meta.note);
    base.meta.template = normalizeTemplate(meta.template || base.meta.template);
    base.meta.canvasSize = stringOr(meta.canvasSize, base.meta.canvasSize);
    base.meta.layout = normalizeLayout(meta.layout || base.meta.layout);
    base.meta.accentColor = stringOr(meta.accentColor, base.meta.accentColor);

    if (data.background && data.background.dataUrl) {
      base.background = {
        name: stringOr(data.background.name, "background"),
        dataUrl: stringOr(data.background.dataUrl, "")
      };
    }

    base.people = Array.isArray(data.people) ? data.people.map(function (person) {
      return {
        id: stringOr(person.id, createId()),
        name: stringOr(person.name, "メンバー"),
        imageDataUrl: stringOr(person.imageDataUrl || person.dataUrl || person.image, ""),
        assignment: normalizeAssignment(person.assignment || person.group || person.instance),
        builtin: Boolean(person.builtin)
      };
    }) : [];

    if (!base.builtinsDisabled) {
      mergeBuiltinMembers(base.people);
    }
    ensureUniquePeople(base.people);
    return base;
  }

  function mergeBuiltinMembers(people) {
    var byId = {};
    people.forEach(function (person) {
      byId[person.id] = person;
    });
    createBuiltinMembers().forEach(function (member) {
      if (!byId[member.id]) {
        people.push(member);
        return;
      }
      byId[member.id].builtin = true;
      if (!byId[member.id].imageDataUrl || byId[member.id].imageDataUrl.indexOf("assets/members/") === 0) {
        byId[member.id].imageDataUrl = member.imageDataUrl;
      }
    });
  }

  function normalizeTemplate(value) {
    var text = String(value || "").toLowerCase();
    if (text === "dark" || text === "neon") return "night";
    if (text === "simple") return "minimal";
    if (text === "clean" || text === "night" || text === "pop" || text === "minimal") return text;
    return "clean";
  }

  function normalizeLayout(value) {
    var text = String(value || "").toLowerCase();
    if (text === "split" || text === "two") return "two-column";
    if (text === "stacked" || text === "compact" || text === "two-column" || text === "instance-poster") return text;
    return "instance-poster";
  }

  function normalizeAssignment(value) {
    var text = String(value || "").toLowerCase();
    if (text === "1" || text === "instance1" || text === "instance-1") return "instance1";
    if (text === "2" || text === "instance2" || text === "instance-2") return "instance2";
    return "unassigned";
  }

  function ensureUniquePeople(people) {
    var used = {};
    people.forEach(function (person) {
      if (!person.id || used[person.id]) person.id = createId();
      used[person.id] = true;
      person.assignment = normalizeAssignment(person.assignment);
    });
  }

  function stringOr(value, fallback) {
    if (value === null || typeof value === "undefined") return fallback;
    return String(value);
  }

  function buildFileName(prefix, extension) {
    var title = (state.meta.title || prefix).replace(/[\\/:*?"<>|]+/g, "").trim();
    var date = state.meta.date ? "-" + state.meta.date.replace(/[\\/:*?"<>|]+/g, "").trim() : "";
    return (title || prefix) + date + "." + extension;
  }

  function buildInstanceFileName(assignment, extension) {
    var title = (state.meta.title || "vrc-attendance").replace(/[\\/:*?"<>|]+/g, "").trim();
    var date = state.meta.date ? "-" + state.meta.date.replace(/[\\/:*?"<>|]+/g, "").trim() : "";
    var suffix = assignment === "instance1" ? "-instance1" : "-instance2";
    return (title || "vrc-attendance") + suffix + date + "." + extension;
  }

  function formatDateLabel(value) {
    if (!value) return "";
    return String(value).replace(/-/g, "/");
  }

  function createId() {
    return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
  }

  function setStatus(message, kind) {
    if (!el.statusMessage) return;
    el.statusMessage.textContent = message || "";
    el.statusMessage.classList.remove("is-success", "is-error");
    if (kind === "success") el.statusMessage.classList.add("is-success");
    if (kind === "error") el.statusMessage.classList.add("is-error");
  }

  function fontSpec(size, weight) {
    return Math.round(weight || 600) + " " + Math.round(size) + "px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  }

  function fitText(ctx, text, x, y, maxWidth, fontSize, weight, align) {
    var safeText = String(text || "");
    var size = Math.round(fontSize);
    while (size > 10) {
      ctx.font = fontSpec(size, weight);
      if (ctx.measureText(safeText).width <= maxWidth) break;
      size -= 1;
    }
    ctx.textAlign = align || "left";
    ctx.textBaseline = "top";
    ctx.fillText(safeText, x + (ctx.textAlign === "center" ? maxWidth / 2 : 0), y, maxWidth);
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, fontSize, lineHeight, maxLines, baseline) {
    var words = String(text || "").replace(/\r/g, "").split(/\s+/);
    var lines = [];
    var current = "";
    ctx.font = fontSpec(fontSize, 600);

    words.forEach(function (word) {
      var test = current ? current + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    });
    if (current) lines.push(current);
    if (!lines.length) lines = [String(text || "")];
    lines = lines.slice(0, maxLines || 2);

    var linePx = fontSize * (lineHeight || 1.35);
    var startY = baseline === "bottom" ? y - linePx * (lines.length - 1) : y;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    lines.forEach(function (line, index) {
      fitText(ctx, line, x, startY + linePx * index, maxWidth, fontSize, 600, "left");
    });
  }

  function getMargin(width, height) {
    return Math.round(clamp(Math.min(width, height) * 0.055, 42, 88));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function circle(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  }

  function roundRect(ctx, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
