var StateEnum = {
  INTRO: 1,
  AYAH_LOADED: 2,
  RECORDING: 3,
  COMMIT_DECISION: 4,
  THANK_YOU: 5
}
const AYAHS_PER_SUBISSION = 5;
var state = StateEnum.INTRO;
var session_id = null;
var session_count = 0;
var ayah_data;
var recording_data = new Array(AYAHS_PER_SUBISSION);
let passedOnBoarding;
let currentSurah;
let ayahsRecited;
let continuous = false;
let preloadedAyahs = {};

try {
  passedOnBoarding = Boolean(localStorage.getItem("passedOnBoarding"));
  ayah_data = JSON.parse(localStorage.getItem("lastAyah"));
  ayahsRecited = Number(localStorage.getItem("ayahsRecited"));
  continuous = Boolean(localStorage.getItem("continuous"))
  $('#continuous').prop('checked', continuous);
  if(passedOnBoarding) {
    $("#progress").hide();
    $(".navbar").css("display", "flex");
    $(".tg-list-item span").css("display", "none");

  }
} catch (e) {
  console.log(e.message);
}

window.mySwipe = new Swipe(document.getElementById('slider'), {
  disableScroll: true,
  startSlide: ayah_data ? 1 : 0
});

String.prototype.trunc =
  function(n){
    return this.substr(0,n-1)+(this.length>n?'&hellip;':'');
  };

function load_ayah_callback(data) {
  state = StateEnum.AYAH_LOADED;
  ayah_data = data;
  $("#mic").removeClass("recording");
  // images are not rendered well in mobile.
  // if (isMobile.os()) {
    // $("#ayah-text").text(data.line);
  // } else {
    $("#ayah-text").html("<img src='"+data.image_url+"' class='ayah-image'>")
  // }
  setLastAyah(data)
  $("#surah-num").text(data.surah);
  $("#ayah-num").text(data.ayah);
  $(".note-button.previous").show();
  $(".note-button.next").show();
  $(".tg-list-item").show();
  session_id = data.hash;
  for (let i=0; i < session_count % AYAHS_PER_SUBISSION + 2; i++) {
    $(".progress-bubble:nth-of-type("+i+")").addClass("complete");
  }
  loadNextAyah();
  loadPreviousAyah()
}

// Ayah here is the last Ayah which retrieved from localstorage
if(ayah_data)
  load_ayah_callback(ayah_data);


function targetHasId(target, id) {
  if ($(target).parents("#"+id).length || $(target).attr('id') == id) {
    return true
  }
  return false
}

$("footer .btn").click(function(evt) {
  if (state == StateEnum.INTRO || state == StateEnum.THANK_YOU) {
    recording_data = new Array(AYAHS_PER_SUBISSION);
      $(".note-button.previous").show();
      $(".note-button.next").show();
      $(".tg-list-item").show();
    window.mySwipe.slide(1)
      $(".complete").removeClass("complete");
      $("#ayah").show();
      $("#mic").show();
      if(!ayah_data)
        getRandomAyah()
  } else if (targetHasId(evt.target, "submit")) {
    if(continuous) {
      if (recorder) {
        recorder.exportWAV(function(blob) {
          recording_data[session_count % AYAHS_PER_SUBISSION] = {
            surah_num: ayah_data.surah,
            ayah_num: ayah_data.ayah,
            hash_string: session_id,
            audio: blob
          }
          stopRecording()
          const record = recording_data[session_count % AYAHS_PER_SUBISSION];
          if (record) {
            api.send_recording(record.audio, record.surah_num, record.ayah_num, record.hash_string);
            session_count += 1;
            try {
              localStorage.setItem("ayahsRecited", String(ayahsRecited + session_count))
            } catch (e) {
              console.log(e.message)
            }
          }
          renderCounter(1)
          $(".review").hide();
          $(".note-button.previous-ayah").hide()
          $("#mic").show()
          setNextAyah()
        })
      }
    } else {
      const record = recording_data[session_count % AYAHS_PER_SUBISSION];
      if (record) {
        api.send_recording(record.audio, record.surah_num, record.ayah_num, record.hash_string);
        session_count += 1;
        try {
          localStorage.setItem("ayahsRecited", String(ayahsRecited + session_count))
        } catch (e) {
          console.log(e.message)
        }
      }
      renderCounter(1)
      if (session_count % AYAHS_PER_SUBISSION == 0 && !passedOnBoarding) {
        state = StateEnum.THANK_YOU;
        window.mySwipe.next();
        $("#ayah").hide();
        $("#thank-you").show();
        $(".tg-list-item span").css("display", "none");
        try {
          localStorage.setItem("passedOnBoarding", String(true))
          passedOnBoarding = true
        }
        catch (e) {
          console.log(e.message)
        }
        $(".review").hide()
      } else {
        $(".review").hide();
        $(".note-button.previous-ayah").hide()
        $("#mic").show()
        setNextAyah()

      }
    }


  } else if (state == StateEnum.AYAH_LOADED ||
      (state == StateEnum.COMMIT_DECISION && targetHasId(evt.target, "retry"))) {
    if(!continuous) {
      startRecording(() => {
        state = StateEnum.RECORDING;
        $(".review").hide();
        $("#mic").show();
        $("#mic").addClass("recording");
        $("#mic").css("margin-bottom", "60px")
        $(".tg-list-item").hide();
        $(".note-button.next").hide();
        $(".note-button.previous").hide();
        $(".note-button.previous-ayah").hide();
      })
    } else if (continuous) {
      startRecording()
      state = StateEnum.RECORDING;
      $(".review").hide();
      $("#mic").show();
      $("#mic").addClass("recording");
      $(".review").css("display", "flex");
      $("#retry").hide();
      $(".recording-note").show()
      $(".review #submit").css("margin-top", "10px")
      $("#mic").html(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34" style="left: -1px"><rect xmlns="http://www.w3.org/2000/svg" rx="3" id="svg_1" height="20" width="21" y="2.5" x="2.5" stroke-width="0" stroke="#fff" fill="#fff"/></svg>`)
      $(".tg-list-item").hide();
      $(".note-button.next").hide();
      $(".note-button.previous").hide();
      $(".note-button.previous-ayah").hide();
    }
  } else if (state == StateEnum.RECORDING) {
    handleStopButton()
  }
});

$('.dropdown .select').click(function () {
  $(this).parent().attr('tabindex', 1).focus();
  $(this).parent().toggleClass('active');
  $(this).parent().find('.dropdown-menu').slideToggle(300);
});
$('.dropdown .select').focusout(function () {
    $(this).parent().removeClass('active');
    $(this).parent().find('.dropdown-menu').slideUp(300);
});
$('.dropdown .dropdown-menu ul li').click(handleHeritageListItemClick);

function handleHeritageListItemClick() {
  const parent = $(this).parents('.dropdown')
  parent.find('span').text($(this).text());
  parent.find('input[type="hidden"]').attr('value', $(this).attr('id'));
  parent.removeClass('active');
  parent.find('.dropdown-menu').slideUp(300);
}


const renderSurahs = (surahs) => {
  const surahsList = $(".screen5 .content ul");
  surahsList.html("");
  for (let surahKey in surahs) {
    surah = surahs[surahKey];
    surahsList.append(`
    <li onclick="getSurah(${surahKey})" data-key="${surahKey}" class=${ ayah_data.surah === surahKey ? "active": "" }>
      <p class="number">${ surahKey }</p>
      <div class="text">
        <p>
          ${ surah.latin } (${surah.english})
        </p>
        <p  class="arabic" data-number=${surahKey}/>
      </div>
    </li>
  `);
  }
  const activeOne = document.querySelector(".screen5 .content ul li.active");
  surahsList.scrollTop(Number(activeOne.getAttribute("data-key")) * 75 - ( 3 * 75));
}

$(".screen5 .content form").submit((e) => e.preventDefault());
$(".screen6 .content form").submit((e) => e.preventDefault());
$("#demographics-form").submit((e) => e.preventDefault());


$(".screen5 .content form .input-wrapper input").keyup(e => {
  const value = e.target.value;
  if(!value)
    renderSurahs(surahs);
  const output = {};
  const out = Object.keys(surahs).filter((elm) => {
    return (
      surahs[elm].arabic.includes(value.toLowerCase().trim()) ||
      surahs[elm].english.toLocaleLowerCase().includes(value.toLowerCase().trim())  ||
      surahs[elm].latin.toLocaleLowerCase().includes(value.toLowerCase().trim())
    );
  }).forEach(elm => output[elm] = surahs[elm]);

  renderSurahs(output)
});
$(".screen6 .content form .input-wrapper input").keyup(e => {
  const value = e.target.value
  currentSurah = currentSurah || ayah_data.surah
  const ayahs = ayahsDict[currentSurah]
  if(!value)
    renderAyahs(currentSurah, ayahs)
  const output = {}
  const out = Object.keys(ayahs).filter((elm) => {
    return (
      ayahs[elm].text.includes(value.toLowerCase().trim())
    )
  }).forEach(elm => output[elm] = ayahs[elm])

  renderAyahs(currentSurah, output)
});

$(".dropdown-menu .search input[type='text']").keyup(handleHeritageSearch)

const renderAyahs = (surahKey, ayahs) => {
  const $ayahsList = $(".screen6 .content ul");
  $ayahsList.html("");
  for(let ayahKey in ayahs) {
    $ayahsList.append(`
    <li onclick="setAyah(${surahKey}, ${ayahKey})" data-key="${ayahKey}" class=${ ayah_data.ayah === ayahKey && surahKey === ayah_data.surah ? "active": "" }>
      <p class="number">
        ${ ayahKey }
      </p>
      <p class="text">
        ${ ayahs[ayahKey].displayText.trunc(isMobile.os() ? 60 : 95) }
      </p>
    </li>
  `)
  }
  const activeOne = document.querySelector(".screen6 .content ul li.active")
  if (activeOne) {
    $ayahsList.scrollTop(Number(activeOne.getAttribute("data-key")) * 78 - (3 * 78))
  }else {
    $ayahsList.scrollTop(0)
  }
};

const getSurah = (surahKey) => {
  renderAyahs(surahKey, ayahsDict[surahKey]);
  currentSurah = surahKey;
  $(".screen6 .content .title h3").text(surahs[surahKey].arabic);
  window.mySwipe.slide(5);
};

function setLastAyah(ayah) {
  try {
    localStorage.setItem("lastAyah", JSON.stringify(ayah))
  } catch (e) {
    console.log(e.message)
  }
}

const setAyah = (surahKey, ayah) => {
  if(state == StateEnum.RECORDING) {
    handleStopButton(true)
    $(".note-button.previous-ayah").hide();
  }
  api.get_specific_ayah(surahKey, ayah, load_ayah_callback);
  window.mySwipe.slide(1);
  if(passedOnBoarding) {
    $("#progress").hide();
    $(".navbar").css("display", "flex");
  }
  $("#ayah").show();
  $("#mic").show();
  $(".review").hide();
}
const setPreviousAyah = () => {
  if(preloadedAyahs.prevAyah) {
    load_ayah_callback(preloadedAyahs.prevAyah);
    setLastAyah(preloadedAyahs.prevAyah)
    return false;
  }
  const { ayah, surah } = ayah_data;
  const prevAyah = Number(ayah) - 1;
  if(ayah == 1) {
    if(surah == 1) {
      setAyah(114, 6)
    } else {
      const prevSurah = Number(surah) - 1;
      setAyah(prevSurah, surahs[prevSurah].ayah)
    }
  }
  else
    setAyah(surah, String(prevAyah))
};

const setNextAyah = (dontstart) => {
  if(preloadedAyahs.nextAyah) {
    load_ayah_callback(preloadedAyahs.nextAyah)
    setLastAyah(preloadedAyahs.nextAyah)
    if(!dontstart && continuous && passedOnBoarding)
      $("#mic").trigger("click");
    return false
  }
  const { ayah, surah } = ayah_data
  const nextAyah = Number(ayah) + 1
  if(surahs[surah]["ayah"] == nextAyah - 1) {
    if(surah == "114" && ayah == "6") {
      setAyah("1", "1")
    } else {
      const nextSurah = Number(surah) + 1;
      setAyah(nextSurah, 1)
    }
  }
  else
    setAyah(surah, String(nextAyah))
}

function loadNextAyah() {
  let callback = (data) => {
    preloadedAyahs.nextAyah = data;
    $('<img/>')[0].src = data.image_url;
  }
  const { ayah, surah } = ayah_data;
  const nextAyah = Number(ayah) + 1;
  if(surahs[surah]["ayah"] == nextAyah - 1) {
    if(surah == "114" && ayah == "6") {
      api.get_specific_ayah(String(1), String(1), callback)
    } else {
      const nextSurah = Number(surah) + 1;
      api.get_specific_ayah(String(nextSurah), String(1), callback)
    }

  }
  else {
    api.get_specific_ayah(surah, String(nextAyah), callback)
  }
}

function loadPreviousAyah() {
  let callback = (data) => {
    preloadedAyahs.prevAyah = data;
    $('<img/>')[0].src = data.image_url;
  }
    const { ayah, surah } = ayah_data;
    const prevAyah = Number(ayah) - 1;
    if(ayah == 1) {
      if(surah == 1) {
        api.get_specific_ayah(String(114), surahs[114].ayah, callback)
      } else {
        const prevSurah = Number(surah) - 1;
        api.get_specific_ayah(String(prevSurah), surahs[prevSurah].ayah, callback)
      }

    }
    else {
      api.get_specific_ayah(surah, String(prevAyah), callback)
    }
}

function renderCounter(n) {
  const counter = $(".navbar .counter");
  // const newCount = counter.html().includes("k") ? (Number(counter.html().replace("k", "")) * 1000 + n) : Number(counter.html()) + n
  var newCount = incrementCount() 
  newCount = commaFormatter(newCount);
  counter.html(`${newCount}`)
  renderSubscribeCounter(newCount)
}
renderCounter(0);

function renderSubscribeCounter(count) {
  $(".screen4 .content .text strong").html(count)
}

const goToDemographics = () => {
  window.mySwipe.slide(2)
}

const goToSubscribe = () => {
  window.mySwipe.slide(3)
}

const handleStopButton = (dontGetNext) => {
  if (recorder) {
    recorder.exportWAV(function(blob) {
      recording_data[session_count % AYAHS_PER_SUBISSION] = {
        surah_num: ayah_data.surah,
        ayah_num: ayah_data.ayah,
        hash_string: session_id,
        audio: blob
      }
      stopRecording()
      if(continuous) {
        const record = recording_data[session_count % recording_data.length];
        if (record) {
          api.send_recording(record.audio, record.surah_num, record.ayah_num, record.hash_string);
          session_count += 1;
          if(!dontGetNext)
            setNextAyah(true)
          try {
            localStorage.setItem("ayahsRecited", String(ayahsRecited + session_count))
          } catch (e) {
            console.log(e.message)
          }
        }
        renderCounter(1)
        state = StateEnum.AYAH_LOADED;
        $("#mic").removeClass("recording");
        $(".review #submit").css("margin-top", "35px")
        $(".note-button.next").show();
        $(".note-button.previous").show();
        $(".tg-list-item").show();
        $("#retry").show()
        $(".review").hide()
        $("#mic").html(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
          `)
        $(".recording-note").hide()
      }
    })
  }
  if(!continuous) {
    state = StateEnum.COMMIT_DECISION;
    $("#mic").css("margin-bottom", "0")
    $(".review").css("display", "flex");
    $("#mic").removeClass("recording");
    $("#mic").hide();
    $(".note-button.previous-ayah").show();
    $(".note-button.next").hide();
    $(".note-button.previous").hide();
  }
}

const submitDemographics = () => {
  const serializedForm = $("#demographics-form").serializeArray();
  const gender = serializedForm[0].value;
  const age = serializedForm[1].value;
  const ethnicity = serializedForm[2].value;
  console.log(gender, age, ethnicity)
  if(gender && age && ethnicity) {
    $.ajax(
      {
        type: "POST",
        url: "/api/demographics/",
        data: $("#demographics-form").serialize(),
        dataType: "json",
        success: (data) => {
        }
      }
    );
    window.mySwipe.next()
  }
};

const skipDemographic = () => {
  $(".review").hide();
  $("#mic").show();
  $("#ayah").show();
  $("#progress").hide();
  $(".navbar").css("display", "flex");
  $(".note-button.previous-ayah").hide();
  setNextAyah(true)
  window.mySwipe.slide(1)
}

const toggleNavbarMenu = () => {
  const hamburger = document.querySelector(".hamburger svg");
  hamburger.classList.toggle('active');
  $(".navbar ul").toggle()
}

const navigateToChangeAyah = (surahKey = ayah_data.surah) => {
  window.mySwipe.slide(5)
  renderAyahs(surahKey, ayahsDict[surahKey]);
  renderSurahs(surahs)
}

function incrementCount(num){
  const counter = $(".navbar .counter");
  const newCount = Number(counter.html().replace(",", "")) + 1
  return newCount
}

function commaFormatter(num){
  return Number(num).toLocaleString()
}

function kFormatter(num) {
  return num > 999 ? (num/1000).toFixed(1) + 'k' : num
}

$("#continuous").click(() => {
  continuous = $("#continuous").is(":checked")
  if(continuous === false)
    setContinuousChecked("")
  else
    setContinuousChecked(continuous)
})

function setContinuousChecked(value) {
  try {
    localStorage.setItem("continuous", String(value))
  } catch (e) {
    console.log(e.message)
  }
}

function handleReviewPreviousAyah() {
  $(".review").hide();
  $("#mic").show();
  $(".note-button.previous-ayah").hide();
  setPreviousAyah();
}

function getRandomAyah() {
  api.get_ayah(load_ayah_callback);
}

function handleHeritageSearch(e) {
  e.preventDefault()
  const value = e.currentTarget.value.trim().toLowerCase()
  const searchList = $(".dropdown-menu ul.search")
  const mainList = $(".dropdown-menu ul.main")

  if (value) {
    filterHeritageListItems(value)
  } else {
    mainList.show()
    searchList.hide()
  }

  function filterHeritageListItems (value) {
    searchList.show()
    mainList.hide()
    searchList.html($(".dropdown-menu ul.main li").clone().filter(function () {
      const status = $(this).html().toLowerCase().includes(value)
      if(status)
        $(this).click(handleHeritageListItemClick);
      return status
    }))
  }
}

if(isMobile.os()) {
  // $(".mobile-app").show();
}
else {
  const sheet = document.createElement("style")
  sheet.append(`
  *::-webkit-scrollbar {
    width: 8px;
  }

  *::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    border-radius: 23px;
  }

  *::-webkit-scrollbar-thumb {
    background-color: #5ec49e;
    outline: 1px solid slategrey;
    border-radius: 23px;
  }
`);
  document.head.appendChild(sheet)
}
