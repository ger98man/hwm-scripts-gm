// ==UserScript==
// @name           hwm_warlog_filter_gm
// @author         bmxcs
// @namespace      hwm_bmxcs_personal
// @description    Фильтр протокола боёв по типу боя (с добором строк со следующих страниц) и винрейт ГТ на странице.
// @version        1.1
// @encoding 	   utf-8
// @include        http*://*heroeswm.ru/pl_warlog.php*
// @include        http*://*lordswm.com/pl_warlog.php*
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_addStyle
// ==/UserScript==

if (typeof GM_getValue != 'function') {
	this.GM_getValue=function (key,def) {return localStorage[key] || def;};
	this.GM_setValue=function (key,value) {return localStorage[key]=value;};
}
if (typeof GM_addStyle != 'function') {
	this.GM_addStyle=function (key) {
		var style = document.createElement('style');
		style.textContent = key;
		document.querySelector("head").appendChild(style);
	}
}

GM_addStyle('.hwm_wf_panel {margin:4px 0 8px; padding:5px 8px; font-size:11px; background:#fbf8f0; border:1px solid #d8cba9; border-radius:4px;}');
GM_addStyle('.hwm_wf_panel select {font-size:11px; margin-right:6px;}');
GM_addStyle('.hwm_wf_k {color:#696156;}');

function $(id) { return document.querySelector(id); }

function addEvent(elem, evType, fn) {
	elem.addEventListener(evType, fn, false);
}

function URLAttrValueGet(attr_name, aurl)
{
  var results = new RegExp("[\\?&]" + attr_name + "=([^&#]*)").exec(aurl);
  return results == null ? "" : results[1];
}

function Ajax(AMethod, AURL, AParams, ACallBackFunc)
{
  var LRequest = new XMLHttpRequest();
  LRequest.open(AMethod, AURL, true);
  LRequest.overrideMimeType('text/html; charset=windows-1251');
  LRequest.send(AParams);
  LRequest.onreadystatechange = function()
  {
    if (LRequest.readyState == 4)
      ACallBackFunc(LRequest.responseText);
  };
}

function Trim(AText)
{
  return AText.replace(/^\s+|\s+$|^(&nbsp;)+|(&nbsp;)+$/g, '');
}

// ------------------ протокол боёв

var FILTER_PAGES = 20;         // сколько следующих страниц читать, чтобы набрать полную страницу с фильтром
// Типы ГТ, которые скрипт экспоумки узнал по боям с очками ГТ (общий localStorage страницы)
var SHARED_GT_TYPES_KEY = 'hwm_gt_types';

// Группы фильтра протокола: тип боя - число из комментария <!--40--> в строке протокола.
var BATTLE_GROUPS = [
  {Key: 'gt', Name: 'ГТ', Types: ['40']},
  {Key: 'gn', Name: 'ГН', Types: ['127']},
  {Key: 'go', Name: 'ГО', Types: []},
  {Key: 'gs', Name: 'ГС', Types: []},
  {Key: 'gv', Name: 'ГВ', Types: []},
  {Key: 'gr', Name: 'ГР', Types: []},
  {Key: 'gl', Name: 'ГЛ', Types: []},
  {Key: 'gi', Name: 'ГИ', Types: ['95']},
  {Key: 'ev', Name: 'Ивенты', Types: ['126', '152']}
];

function LoadGTTypes()
{
  try { return JSON.parse(localStorage[SHARED_GT_TYPES_KEY] || '[]') || []; }
  catch (e) { return []; }
}

function BattleGroupOf(AType, AGTTypes)
{
  if (AGTTypes.indexOf(AType) > -1)
    return 'gt';
  for (var i = 0; i < BATTLE_GROUPS.length; i++)
    if (BATTLE_GROUPS[i].Types.indexOf(AType) > -1)
      return BATTLE_GROUPS[i].Key;
  return 'other';
}

function FindWarlogBox(ADoc)
{
  var LList = ADoc.querySelectorAll('div.global_a_hover');
  for (var i = 0; i < LList.length; i++)
    if (LList[i].querySelector('a[href*="war.php?warid="]'))
      return LList[i];
  return null;
}

// Строки протокола: узлы между <br>, warid из ссылки, тип боя из комментария <!--126-->
function ExtractWarlogRows(ABox)
{
  var LRows = [], LNodes = [];
  // Строки могут быть уже обёрнуты в span.hwm_ea_row (другим скриптом) - разворачиваем
  var LChildren = [];
  for (var i = 0; i < ABox.childNodes.length; i++)
  {
    var LChild = ABox.childNodes[i];
    if (LChild.nodeType == 1 && LChild.classList.contains('hwm_ea_row'))
      LChildren = LChildren.concat(Array.prototype.slice.call(LChild.childNodes));
    else
      LChildren.push(LChild);
  }
  for (var i = 0; i < LChildren.length; i++)
  {
    var LNode = LChildren[i];
    LNodes.push(LNode);
    if (LNode.nodeName != 'BR' && i < LChildren.length - 1)
      continue;
    var LRow = {WarId: '', Type: '', Nodes: LNodes};
    for (var j = 0; j < LNodes.length; j++)
    {
      var LN = LNodes[j];
      if (LN.nodeType == 8)
      {
        LRow.Type = Trim(LN.nodeValue);
        continue;
      }
      if (LN.nodeType == 1)
      {
        var LA = LN.nodeName == 'A' ? LN : LN.querySelector('a[href*="war.php?warid="]');
        if (!LRow.WarId && LA && /warid=(\d+)/.test(LA.getAttribute('href')))
          LRow.WarId = /warid=(\d+)/.exec(LA.getAttribute('href'))[1];
      }
    }
    if (LRow.WarId)
      LRows.push(LRow);
    LNodes = [];
  }
  return LRows;
}

// Итог боя для игрока: в протоколе победители выделены жирным.
// 1 - победа, 0 - поражение, -1 - не определить (игрока нет в строке или жирных нет)
function RowResult(ARow, APlayerId)
{
  var LFound = false, LWin = false, LAnyBold = false;
  for (var i = 0; i < ARow.Nodes.length; i++)
  {
    var LN = ARow.Nodes[i];
    if (LN.nodeType != 1)
      continue;
    var LLinks = (LN.nodeName == 'A' && /pl_info\.php/.test(LN.getAttribute('href') || '')) ? [LN] : LN.querySelectorAll('a[href*="pl_info.php"]');
    for (var j = 0; j < LLinks.length; j++)
    {
      var LBold = !!LLinks[j].closest('b');
      LAnyBold = LAnyBold || LBold;
      var LMatch = /[?&]id=(\d+)/.exec(LLinks[j].getAttribute('href') || '');
      if (LMatch && LMatch[1] == APlayerId)
      {
        LFound = true;
        LWin = LWin || LBold;
      }
    }
  }
  return (LFound && LAnyBold) ? (LWin ? 1 : 0) : -1;
}

function WarlogPageUrl(APage)
{
  return location.pathname + '?id=' + URLAttrValueGet('id', location.href) + '&page=' + APage;
}

function WarlogProcess()
{
  var LBox = FindWarlogBox(document);
  if (!LBox)
    return;

  // Оборачиваем строки, чтобы их можно было скрывать фильтром
  var LRows = ExtractWarlogRows(LBox);
  for (var i = 0; i < LRows.length; i++)
  {
    var LParent = LRows[i].Nodes[0].parentNode;
    if (LParent != LBox && LParent.classList.contains('hwm_ea_row'))
    {
      LRows[i].Span = LParent;
      continue;
    }
    var LSpan = document.createElement('span');
    LSpan.className = 'hwm_ea_row';
    LSpan.setAttribute('data-type', LRows[i].Type);
    LBox.insertBefore(LSpan, LRows[i].Nodes[0]);
    for (var j = 0; j < LRows[i].Nodes.length; j++)
      LSpan.appendChild(LRows[i].Nodes[j]);
    LRows[i].Span = LSpan;
  }

  var LPanel = document.createElement('div');
  LPanel.className = 'hwm_wf_panel';
  LPanel.innerHTML =
    '<b>Фильтр:</b> <select id="hwm_wf_filter"></select> ' +
    '<span id="hwm_wf_status" class="hwm_wf_k"></span>' +
    '<div id="hwm_wf_winrate"></div>';
  LBox.parentNode.insertBefore(LPanel, LBox);
  var LSelect = $('#hwm_wf_filter');
  var LStatus = $('#hwm_wf_status');
  var LWinrate = $('#hwm_wf_winrate');
  var LPlayerId = URLAttrValueGet('id', location.href);
  var LShown = [];            // строки, показанные сейчас на странице (с добранными)

  var LGTTypes = BATTLE_GROUPS[0].Types.concat(LoadGTTypes());

  // Винрейт по боям ГТ среди показанных строк
  function ShowWinrate()
  {
    var LWins = 0, LTotal = 0;
    for (var i = 0; i < LShown.length; i++)
    {
      if (BattleGroupOf(LShown[i].Type, LGTTypes) != 'gt')
        continue;
      var LRes = RowResult(LShown[i], LPlayerId);
      if (LRes < 0)
        continue;
      LWins += LRes;
      LTotal++;
    }
    LWinrate.innerHTML = LTotal == 0 ? '' :
      '<b>Винрейт ГТ на странице:</b> ' + LWins + ' побед из ' + LTotal + ' (<b>' +
      Math.round(LWins / LTotal * 100) + '%</b>), поражений ' + (LTotal - LWins);
  }

  function FillFilter()
  {
    var LHtml = '<option value="">Все</option>';
    for (var i = 0; i < BATTLE_GROUPS.length; i++)
      LHtml += '<option value="' + BATTLE_GROUPS[i].Key + '">' + BATTLE_GROUPS[i].Name + '</option>';
    LHtml += '<option value="other">Прочее</option>';
    LSelect.innerHTML = LHtml;
    LSelect.value = GM_getValue('warlog_filter', 'gt');
    if (LSelect.selectedIndex < 0)
      LSelect.value = '';
  }

  function MatchFilter(AType, AFilter)
  {
    return AFilter == '' || BattleGroupOf(AType, LGTTypes) == AFilter;
  }

  // С фильтром добираем строки со следующих страниц, чтобы страница была полной
  var LPageSize = LRows.length;
  var LCurPage = parseInt(URLAttrValueGet('page', location.href)) || 0;
  var LPages = [];            // строки следующих страниц: LPages[0] - страница LCurPage + 1
  var LPagesEnd = false;
  var LFillToken = 0;
  var LExtra = document.createElement('div');
  LBox.parentNode.insertBefore(LExtra, LBox.nextSibling);

  function ApplyFilter()
  {
    var LFilter = LSelect.value;
    var LCount = 0;
    LShown = [];
    for (var i = 0; i < LRows.length; i++)
    {
      var LShow = MatchFilter(LRows[i].Type, LFilter);
      LRows[i].Span.style.display = LShow ? '' : 'none';
      if (LShow)
      {
        LShown.push(LRows[i]);
        LCount++;
      }
    }
    LExtra.innerHTML = '';
    LStatus.innerHTML = '';
    ShowWinrate();
    if (LFilter == '')
      return;
    var LToken = ++LFillToken;
    var LPageIndex = 0;
    function Fill()
    {
      if (LToken != LFillToken)
        return;
      for (; LPageIndex < LPages.length && LCount < LPageSize; LPageIndex++)
        for (var i = 0; i < LPages[LPageIndex].length && LCount < LPageSize; i++)
        {
          var LRow = LPages[LPageIndex][i];
          if (!MatchFilter(LRow.Type, LFilter))
            continue;
          var LSpan = document.createElement('span');
          for (var j = 0; j < LRow.Nodes.length; j++)
            LSpan.appendChild(document.importNode(LRow.Nodes[j], true));
          LExtra.appendChild(LSpan);
          LShown.push(LRow);
          LCount++;
        }
      ShowWinrate();
      if (LCount >= LPageSize || LPagesEnd || LPages.length >= FILTER_PAGES)
      {
        LStatus.innerHTML = '';
        return;
      }
      var LPage = LCurPage + LPages.length + 1;
      LStatus.innerHTML = 'Добираю бои со страницы ' + (LPage + 1) + '... (' + LCount + ' из ' + LPageSize + ')';
      Ajax('GET', WarlogPageUrl(LPage), null, function(AText) {
        var LPageBox = FindWarlogBox(new DOMParser().parseFromString(AText, 'text/html'));
        var LPageRows = LPageBox ? ExtractWarlogRows(LPageBox) : [];
        if (LPageRows.length == 0)
          LPagesEnd = true;
        else
          LPages.push(LPageRows);
        Fill();
      });
    }
    Fill();
  }

  FillFilter();
  ApplyFilter();
  addEvent(LSelect, 'change', function() {
    GM_setValue('warlog_filter', LSelect.value);
    ApplyFilter();
  });
}

// ------------------ протокол боёв

WarlogProcess();
