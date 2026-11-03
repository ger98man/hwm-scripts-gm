//
// ==UserScript==
// @name           hwm_exp_protocol_gm
// @author         ger98man (личная версия на основе hwm_exp_ability от Pahan)
// @namespace      hwm_bmxcs_personal
// @description    Личная версия: экспоумка, прогноз умелки по боям ГТ, загрузка боёв ГТ из протокола. Фильтр протокола - hwm_warlog_filter_gm. Не обновляется с greasyfork.
// @version        1.25
// @tag            hwm-gm
// @homepageURL    https://github.com/ger98man/hwm-scripts-gm
// @updateURL      https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_exp_protocol_gm.user.js
// @downloadURL    https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_exp_protocol_gm.user.js
// @encoding 	   utf-8
// @include        http*://*heroeswm.ru/home.php*
// @include        http*://*heroeswm.ru/transfer.php*
// @include        http*://*heroeswm.ru/war.php*
// @include        http*://*heroeswm.ru/pl_warlog.php*
// @include        http*://*lordswm.com/pl_warlog.php*
// @include        http*://*lordswm.com/war.php*
// @include        http*://*lordswm.com/home.php*
// @include        http*://*lordswm.com/transfer.php*
// @include        http://178.248.235.15/home.php*
// @include        http://178.248.235.15/transfer.php*
// @grant          GM_deleteValue
// @grant          GM_getValue
// @grant          GM_listValues
// @grant          GM_setValue
// @grant          GM_addStyle
// @grant          GM_log
// @grant          GM_openInTab
// @grant          GM_xmlhttpRequest
// ==/UserScript==

var version = '1.25';
var idn = 'exp_ability';
var str_script_name = 'Експоумка (личная)';
var str_url_sps = '/transfer.php?pahan_sps=' + encodeURIComponent('Подарок. Спасибо за скрипт: '+str_script_name+' v'+version+'.');

if (typeof GM_deleteValue != 'function') {
	this.GM_getValue=function (key,def) {return localStorage[key] || def;};
	this.GM_setValue=function (key,value) {return localStorage[key]=value;};
	this.GM_deleteValue=function (key) {return delete localStorage[key];};

	this.GM_addStyle=function (key) {
		var style = document.createElement('style');
		style.textContent = key;
		document.querySelector("head").appendChild(style);
	}
}
if (typeof GM_listValues != 'function') {
	this.GM_listValues=function () {
		var values = [];
		for (var i=0; i<localStorage.length; i++) {
			values.push(localStorage.key(i));
		}
		return values;
	}
}

GM_addStyle('.dialog {background-color: #F6F3EA; border-radius: 5px; box-sizing: border-box; box-shadow: 0 0 0px 12px rgba(200, 200, 200, 0.5); left: calc(50% - 300px); max-height: calc(100% - 100px); overflow: auto; padding: 15px; position: fixed; top: 50px; z-index: 1105;}');
GM_addStyle('.dialogOverlay {background-color: rgba(0, 0, 0, 0.7); height: 100%; left: 0; position: fixed; top: 0; width: 100%;}');
GM_addStyle('.btn_close {position:absolute;left:calc(100% - 45px);float:right;border:1px solid #abc;width:15px;height:15px;text-align:center;cursor:pointer;}');
GM_addStyle('.btn_settings {text-decoration:underline;cursor:pointer;font-weight:bold;font-size:10px;width:500px;}');
GM_addStyle('.small_text {font-weight:bold;font-size:10px;}');
GM_addStyle('.hwm_ea_box {--ea:#a08a5c; margin:5px 0 0 8px; max-width:300px; padding:5px 8px; font-size:11px; line-height:1.45; color:#3b2a12; background:#fbf8f0; border:1px solid #d8cba9; border-left:3px solid var(--ea); border-radius:4px; cursor:pointer;}');
GM_addStyle('.hwm_ea_box:hover {background:#f3ecdb;}');
GM_addStyle('.hwm_ea_ok {--ea:#3c8d2f;} .hwm_ea_bad {--ea:#c0392b;}');
GM_addStyle('.hwm_ea_head {display:flex; justify-content:space-between; align-items:center; gap:8px;}');
GM_addStyle('.hwm_ea_title {font-weight:bold; font-size:12px;}');
GM_addStyle('.hwm_ea_badge {font-size:10px; font-weight:bold; color:#fff; background:var(--ea); border-radius:8px; padding:0 6px; white-space:nowrap;}');
GM_addStyle('.hwm_ea_pct {font-size:10px; color:#696156;}');
GM_addStyle('.hwm_ea_bar {height:5px; margin:3px 0 4px; background:#e6dcc4; border-radius:3px; overflow:hidden;}');
GM_addStyle('.hwm_ea_bar div {height:100%; background:var(--ea);}');
GM_addStyle('.hwm_ea_k {color:#696156;}');
GM_addStyle('.hwm_ea_panel {margin:4px 0 8px; padding:5px 8px; font-size:11px; background:#fbf8f0; border:1px solid #d8cba9; border-radius:4px;}');
GM_addStyle('.hwm_ea_panel select, .hwm_ea_panel button {font-size:11px; margin-right:6px;}');
GM_addStyle('.hwm_ea_note {font-size:9px; color:#8a806f; margin-top:1px;}');

function addEvent(elem, evType, fn) {
//    elem["on" + evType] = fn;
	if (elem.addEventListener) {
		elem.addEventListener(evType, fn, false);
	}
	else if (elem.attachEvent) {
		elem.attachEvent("on" + evType, fn);
	}
	else {
		elem["on" + evType] = fn;
	}
}

function $(id) { return document.querySelector(id); } 

function URLAttrValueGet(attr_name, aurl)
{
 attr_name = attr_name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
 var regexS = "[\\?&]" + attr_name + "=([^&#]*)";
 var regex = new RegExp( regexS );
 var results = regex.exec( aurl );
 if( results == null )
  return "";
 else
  return results[1];
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
    {
      ACallBackFunc(LRequest.responseText);
    }  
  };
} 

function Trim(AText)
{
  return AText.replace(/^\s+|\s+$|^(&nbsp;)+|(&nbsp;)+$/g, '');
}

function DeleteCRLF(AText)
{
  return AText.replace(/[\n\r]/g, ' ').replace(/\s{2,}/g, ' ');
}

function Assert(ACondition, AMessage)
{
  if (ACondition)
    return;
  localStorage['trade.status'] = 'Stoped';
  alert('ERROR: ' + AMessage);
  throw new Error(AMessage);
}

function FloatFormat(AFloat)
{
  return Math.round(AFloat).toString();
}

function IntFormatWithThouthandSeparator(num){
    var n = num.toString(), p = n.indexOf('.');
    return n.replace(/\d(?=(?:\d{3})+(?:\.|$))/g, function($0, i){
        return p<0 || i<p ? ($0+',') : $0;
    });
}

// ------------------ dialog

function close_setting_form() {
    bg = $('#bgOverlay' + idn) ;
    bgc = $('#bgCenter' + idn) ;
    if( bg ) {
        bg.style.display = bgc.style.display = 'none' ;
    }    
}

function clear_all_params()
{
  if (confirm("Вы действительно хотите скинуть все сохраненные настройки?"))
  {
    var keys = GM_listValues();
    for (var i=0, key=null; key=keys[i]; i++) {
      GM_deleteValue(key);
    }
    close_find_work_info();
  }
}

function setCheck(ch)
{
    if( GM_getValue( ch ) && GM_getValue( ch ) == 1 )
        GM_setValue( ch , 0 );
    else
        GM_setValue( ch , 1 );
}

function setEdit(id, key)
{
  var LValue = parseInt($('#' + id).value);
  GM_setValue(key, LValue);
}

function show_dialog_base(ASettingsHTML)
{
  bg = $('#bgOverlay' + idn) ;
  bgc = $('#bgCenter' + idn) ;
  if( !bg ) {
      bg = document.createElement('div') ;
      bg.id = 'bgOverlay' + idn;
      document.body.appendChild( bg );
      bg.className = 'dialogOverlay';
      addEvent(bg, 'click', close_setting_form);

      bgc = document.createElement('div') ;
      bgc.id = 'bgCenter' + idn ;
      document.body.appendChild( bgc );
      bgc.className = 'dialog';
  }
  bg.style.display = bgc.style.display = 'block' ;  

  bgc.innerHTML = 
    '<div style="border:1px solid #abc;padding:5px;margin:2px;">' +
    '  <div class="btn_close" id="bt_close'+idn+'" title="Закрыть">x</div>' +
    '  <center>' +
    '    <table>' +
    '      <tr>' +
    '        <td><b>'+str_script_name+' <font style="color:#0070FF;">'+version+'</font></b></td>' +
    '      </tr>' +
    '      <tr><td><hr/></td></tr>' +
    '      <tr>' +
    '        <td>' + ASettingsHTML + '</td>' +
    '      </tr>' +
    '      <tr><td><hr/></td></tr>' +
    '      <tr>' +
    '        <td class="small_text" >' +
    '          <a class="small_text" href="'+str_url_sps+'">Сказать спасибо</a>&nbsp;&nbsp;' +
    '          <a class="small_text" style="left:calc(50% - 100px);" href="javascript:void(0);" id="settings_reset'+idn+'">Скинуть все настройки</a> ' +
    '        </td>' +
    '      </tr>' +
    '      <tr>' +
    '        <td class="small_text" >' +
    '          Личная версия. Основано на скрипте <a class="small_text" href="http://www.heroeswm.ru/pl_info.php?id=30547">Pahan.</a>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '  </center>' +
    '</div>';

  addEvent($('#bt_close' + idn), 'click', close_setting_form);  
  addEvent($('#settings_reset' + idn), 'click', clear_all_params);
}

function show_settings_base(ASettingsHTML)
{
  show_dialog_base('<div><b>Настройки:</b></div>' + ASettingsHTML);
}

// ------------------ dialog

function SpsProcess()
{
  if (location.href.indexOf('/transfer.php') > -1)
  {
    var LSps = decodeURIComponent(URLAttrValueGet('pahan_sps', location.href));
    if (LSps != '')
    {
      document.forms.f.nick.value = 'Pahan';
      document.forms.f.gold.value = '500';
      document.forms.f.desc.value = LSps;
    }
  }
}
SpsProcess();

//-----------------------------------

var expelem;

function GetExp()
{
  res = -1;

  var list = document.getElementsByTagName("b");
  for(var i = 0; i < list.length; i++)
  {
    var elem = list[i];
    
    if (elem.innerHTML.indexOf('\u0411\u043E\u0435\u0432\u043E\u0439\u0020\u0443\u0440\u043E\u0432\u0435\u043D\u044C') === 0)
    {
      var subindex = Array.prototype.indexOf.call(elem.parentNode.childNodes, elem);
      expelem = elem.parentNode.childNodes[subindex + 2];
      res = parseInt(expelem.innerHTML.replace(/,/g, ''));  
      break;
    }
  }
  
  return res; 
}

function GetCurrentFractAbility(AElem)
{
  var sublist = AElem.getElementsByTagName("b");
  if (sublist.length > 0)
  {
    var subitem = sublist[0];
    var subindex = Array.prototype.indexOf.call(subitem.parentNode.childNodes, subitem);
    var regex = /\((\d+.\d+)\)/;  
    var regex_res = regex.exec(subitem.parentNode.childNodes[subindex + 1].textContent);
    if (regex_res)
    {
      var LAbility = parseFloat(regex_res[1]);
      var LAbilityToUp = parseFloat(subitem.parentNode.childNodes[subindex + 2].innerHTML);
      var LArray = subitem.parentNode.childNodes[subindex].innerHTML.split(': ');
      var LFration = LArray[0];
      var LAbilityLevel = parseInt(LArray[1]);
      return {Ability: LAbility, AbilityToUp: LAbilityToUp, Fraction: LFration,
        AbilityLevel: LAbilityLevel, IsCurrent: true, IsMain: false};
    }
  }
}

function GetAllFractions()
{
  var LTD = GetTD();
  var LResult = new Array(GetCurrentFractAbility(LTD));
  var LMaxAbl = LResult[0];
  for(i = 0; i < LTD.childNodes.length; i++)
  {
    var cur_el = LTD.childNodes[i];           
    var html = Trim(cur_el.textContent);
    var regex = /\: \d+ \((\d+.\d+)\)/;
    var regex_res = regex.exec(html);
    if(regex_res)
    {
      cur_abil = parseFloat(regex_res[1]);
      if (html.indexOf('\u0413\u0438\u043B\u044C\u0434\u0438\u044F') === -1)
      {
        var next_el = cur_el.parentNode.childNodes[i + 1];
        if (next_el.tagName == 'FONT')
        {
          var LAbility = cur_abil;
          var LAbilityToUp = parseFloat(next_el.innerHTML);
          var LArray = Trim(next_el.previousSibling.textContent).split(': ');
          var LFration = LArray[0];
          var LAbilityLevel = parseInt(LArray[1].split(' (')[0]);
          var LNew = {Ability: LAbility, AbilityToUp: LAbilityToUp, Fraction: LFration,
            AbilityLevel: LAbilityLevel, IsCurrent: false, IsMain: false};
          LResult.push(LNew);
          if (LMaxAbl.Ability < LNew.Ability)
            LMaxAbl = LNew;
        }           
      }
    }
  }
  
  LMaxAbl.IsMain = true; 

  return LResult;       
}

function GetTD()
{
  var list = document.getElementsByTagName("td");
  for(var i = 0; i < list.length; i++)
  {
    var elem = list[i];
//    alert(elem.innerHTML);
    if(  (Trim(elem.innerHTML).indexOf('\u0420\u044B\u0446\u0430\u0440\u044C\u003A') === 0)
      || (Trim(elem.innerHTML).indexOf('<b>\u0420\u044B\u0446\u0430\u0440\u044C\u003A') === 0)  
    )
    {
      return elem;
    }
  } 
}

function GetAbilityToUpInfo()
{
  var racial_skill_lvl = [20,50,90,160,280,500,900,1600,2900,5300,9600,17300];
  var LFract = GetFraction(GM_getValue('selected_fract', ''), GetAllFractions());
  var LLevel = Math.max(parseInt(GM_getValue('selected_level', 0)), (LFract.AbilityLevel + 1));
  var LResult = {Fraction: LFract.Fraction, Level: LLevel, CurrentLevel: LFract.AbilityLevel,
    AbilityToUp: -1, IsMax: false, Progress: 0};
  LResult.IsMax = (LFract.AbilityLevel == racial_skill_lvl.length);
  if (!LResult.IsMax)
  {
    var LTarget = racial_skill_lvl[LLevel - 1];
    var LFrom = LFract.AbilityLevel > 0 ? racial_skill_lvl[LFract.AbilityLevel - 1] : 0;
    LResult.AbilityToUp = LTarget - LFract.Ability;
    LResult.Progress = Math.max(0, Math.min(1, (LFract.Ability - LFrom) / (LTarget - LFrom)));
  }
  return LResult;
}

function abil_fractions_changed()
{
  GM_setValue('selected_fract', $("#hwm_exp_abil_fractions").value);
  GM_deleteValue('selected_level');
  UpdateAbilLevels();
}

function GetFraction(AName, AAllFractions)
{
  for(i = 0; i < AAllFractions.length; i++)
  {
    var LFract = AAllFractions[i];
    if ((AName == '') && LFract.IsMain || (AName != '') && (LFract.Fraction == AName))
      return LFract;
  }
  return AAllFractions[0];
}

function UpdateAbilLevels()
{
  var LSelect = $("#hwm_exp_abil_levels");
  LSelect.innerHTML = '';

  var LFract = GetFraction($("#hwm_exp_abil_fractions").value, GetAllFractions());
  var LSelectedLevel = parseInt(GM_getValue('selected_level', 0));
  for(i = LFract.AbilityLevel + 1; i <= 12; i++)
  {                                    
    var option = document.createElement("option");
    option.value = i;
    option.text = i;
    if (i == LSelectedLevel)
      option.selected = '1';
    LSelect.add(option);      
  }
}

function abil_levels_changed()
{
  GM_setValue('selected_level', $("#hwm_exp_abil_levels").value);
}

function open_setting_form()
{
  var LStats = GetGTStats();
  var LManualExp = parseInt(GM_getValue('battle_exp', 0)) || 0;
  show_settings_base(
    '<div><b>Выберите фракцию и уровень умелки который хотите взять на этом уровне:</b></div>' +
    '<div><select style="width:220;" id="hwm_exp_abil_fractions"></select> Фракция</div>' +
    '<div><select style="width:220;" id="hwm_exp_abil_levels"></select> Уровень умелки</div>' +
    '<div><input type="number" min="0" style="width:220px;" id="hwm_exp_abil_battle_exp" value="' +
      (LManualExp > 0 ? LManualExp : '') + '" placeholder="' +
      (LStats ? 'среднее ГТ: ' + Math.round(LStats.Exp) : 'например 5000') + '"/> Опыт за бой ' +
      '(пусто = среднее по ГТ; умка = опыт / ' +
      (LStats ? 'соотношение ГТ ' + Math.round(LStats.Exp / LStats.Ability) : DEFAULT_RATIO + ', пока нет боёв ГТ') +
      ')</div>' +
    '<div><input type="text" style="width:220px;" id="hwm_exp_abil_nick" value="' +
      GM_getValue('nick', '') + '" placeholder="определяется сам"/> Ваш ник в бою</div>' +
    '<div class="small_text">Записано боёв: ' + LoadBattles().length + '. Считаем по последним ' + GT_BATTLES_AVG + ' боям ГТ.</div>'
  );

  addEvent($('#hwm_exp_abil_battle_exp'), 'change', function() { setEdit('hwm_exp_abil_battle_exp', 'battle_exp'); });
  addEvent($('#hwm_exp_abil_nick'), 'change', function() { GM_setValue('nick', Trim($('#hwm_exp_abil_nick').value)); });
  
  addEvent($('#bgOverlay' + idn), 'click', MainProcess);    
  addEvent($('#bt_close' + idn), 'click', MainProcess);

  var LFractSelect = $("#hwm_exp_abil_fractions");
  addEvent(LFractSelect, 'change', abil_fractions_changed);
  var LAllFractions = GetAllFractions();
  var LSelectedFract = GM_getValue('selected_fract', '');
  for(i = 0; i < LAllFractions.length; i++)
  {
    var LFract = LAllFractions[i];
    var option = document.createElement("option");
    option.value = LFract.Fraction;
    option.text = LFract.Fraction + (LFract.IsMain ? ' (Основа)' : '') +
      (!LFract.IsMain && LFract.IsCurrent ? ' (Играете сейчас)' : '');
    if ((LSelectedFract == '') && LFract.IsMain
      || (LSelectedFract != '') && (LFract.Fraction == LSelectedFract)
    )
    {
      option.selected = '1';
    }
    LFractSelect.add(option);      
  }

  var LLevelSelect = $("#hwm_exp_abil_levels");
  addEvent(LLevelSelect, 'change', abil_levels_changed);
  UpdateAbilLevels();
}

function MainProcess()
{
  var LExp = GetExp();
  if (expelem)
  {
    var LEl = $("#hwm_exp_abil_options");
    if (!LEl)
    {
      LEl = document.createElement('div');
      LEl.id = 'hwm_exp_abil_options';
      LEl.className = 'hwm_ea_box';
      expelem.parentNode.insertBefore(LEl, expelem.nextSibling);
      addEvent(LEl, 'click', open_setting_form);
    }

    var LAbilityToUpInfo = GetAbilityToUpInfo();
    var LHead = '<span class="hwm_ea_title">' + LAbilityToUpInfo.Fraction + ' ' +
      LAbilityToUpInfo.CurrentLevel + (LAbilityToUpInfo.IsMax ? '' : ' → ' + LAbilityToUpInfo.Level) + '</span>';
    if (LAbilityToUpInfo.IsMax)
    {
      LEl.className = 'hwm_ea_box';
      LEl.innerHTML =
        '<div class="hwm_ea_head">' + LHead + '<span class="hwm_ea_badge">max</span></div>' +
        '<div class="hwm_ea_note">Максимальная умелка. Выберите другую фракцию в настройках</div>';
      LEl.title =
        'Вы апнули максимальную умелку фракции ' + LAbilityToUpInfo.Fraction + '\n'+
        'Смените фракцию и уровень умелки который хотите взять на этом уровне';
    }
    else
    {
      var expoability = FloatFormat(LExp / LAbilityToUpInfo.AbilityToUp);
      var LBar =
        '<div class="hwm_ea_bar"><div style="width:' + (LAbilityToUpInfo.Progress * 100).toFixed(1) + '%"></div></div>';
      var LNeed = '<span class="hwm_ea_k">Нужно умки</span> <b>' +
        IntFormatWithThouthandSeparator(LAbilityToUpInfo.AbilityToUp.toFixed(1)) + '</b>' +
        ' <span class="hwm_ea_k">· нужно соотношение ≤</span> <b>' + IntFormatWithThouthandSeparator(expoability) + '</b>';
      LEl.className = 'hwm_ea_box';
      LEl.innerHTML =
        '<div class="hwm_ea_head">' + LHead + '<span class="hwm_ea_pct">' +
          Math.floor(LAbilityToUpInfo.Progress * 100) + '%</span></div>' +
        LBar + '<div>' + LNeed + '</div>' +
        '<div class="hwm_ea_note">Укажите опыт за бой в настройках или проведите бой ГТ</div>';
      LEl.title =
        'Что б взять ' + LAbilityToUpInfo.Level + 'ю умелку фракции ' + LAbilityToUpInfo.Fraction + ' до апа уровня\n'+
        'Вам нужно набрать ' + LAbilityToUpInfo.AbilityToUp + ' умения с соотношением ' + expoability;

      // Опыт за бой: из настроек, иначе среднее по боям ГТ.
      // Умка за бой: опыт / среднее соотношение по боям ГТ (без истории - DEFAULT_RATIO)
      var LStats = GetGTStats();
      var LManualExp = parseInt(GM_getValue('battle_exp', 0)) || 0;
      var LHistRatio = LStats ? LStats.Exp / LStats.Ability : DEFAULT_RATIO;
      var LBattleExp = LManualExp > 0 ? LManualExp : (LStats ? LStats.Exp : 0);
      var LBattleAbility = LBattleExp / LHistRatio;
      var LSource = (LManualExp > 0 ? 'Опыт за бой из настроек' : 'Опыт за бой - среднее по боям ГТ') + ', ' +
        (LStats ? 'соотношение - среднее по последним ' + LStats.Count + ' боям ГТ (' + LStats.Nick + ')'
          : 'соотношение по умолчанию ' + DEFAULT_RATIO + ' (боёв ГТ ещё не записано)');
      if (LBattleExp > 0 && LBattleAbility > 0)
      {
        var LBattlesToAbility = Math.ceil(LAbilityToUpInfo.AbilityToUp / LBattleAbility);
        var LBattlesToLevel = Math.ceil(LExp / LBattleExp);
        var LInTime = LBattlesToAbility <= LBattlesToLevel;
        // Фактическое соотношение опыт/умка по истории боёв ГТ
        var LRatio = Math.round(LBattleExp / LBattleAbility);
        LNeed = '<span class="hwm_ea_k">' + (LStats ? 'Соотношение ГТ' : 'Соотношение') + '</span> <b>' +
            IntFormatWithThouthandSeparator(LRatio) + '</b>' +
            ' <span class="hwm_ea_k">· нужно ≤</span> <b>' + IntFormatWithThouthandSeparator(expoability) + '</b>' +
          '</div><div><span class="hwm_ea_k">Нужно умки</span> <b>' +
            IntFormatWithThouthandSeparator(LAbilityToUpInfo.AbilityToUp.toFixed(1)) + '</b>';
        LEl.className = 'hwm_ea_box ' + (LInTime ? 'hwm_ea_ok' : 'hwm_ea_bad');
        LEl.innerHTML =
          '<div class="hwm_ea_head">' + LHead +
            '<span class="hwm_ea_badge">' + (LInTime ? '✓ успеваете' : '✗ не успеваете') + '</span></div>' +
          LBar +
          '<div><span class="hwm_ea_k">До умелки</span> <b>~' + LBattlesToAbility + '</b> боёв' +
            ' <span class="hwm_ea_k">· до апа</span> <b>~' + LBattlesToLevel + '</b> боёв</div>' +
          '<div>' + LNeed + '</div>' +
          '<div class="hwm_ea_note">' +
            (LManualExp > 0 ? 'Опыт из настроек' : 'Опыт по ' + LStats.Count + ' боям ГТ') +
            (LStats ? ', соотношение по ' + LStats.Count + ' боям ГТ' : ', соотношение по умолчанию') +
            ': ' +IntFormatWithThouthandSeparator(Math.round(LBattleExp)) + ' опыта, ' +
            LBattleAbility.toFixed(2) + ' умки за бой</div>';
        LEl.title +=
          '\n\n' + LSource + '\n' +
          'Опыт за бой: ' + Math.round(LBattleExp) + ', умка за бой: ' + LBattleAbility.toFixed(2) +
          ' (соотношение ' + LRatio + ', нужно ≤ ' + expoability + ')\n' +
          'Боёв до умелки: ~' + LBattlesToAbility + '\n' +
          'Боёв до апа уровня: ~' + LBattlesToLevel + '\n' +
          (LInTime ? 'Успеваете взять умелку до апа' : 'Уровень апнется раньше умелки');
      }
    }    
  }
}

// ------------------ бои ГТ

var GT_BATTLES_KEY = 'gt_battles';
var GT_BATTLES_STORE = 200;
var GT_BATTLES_AVG = 50;
var DEFAULT_RATIO = 500; // опыт / умка, пока нет боёв ГТ (умка = опыт / 1000 * 2)

function LoadBattles()
{
  try { return JSON.parse(GM_getValue(GT_BATTLES_KEY, '[]')) || []; }
  catch (e) { return []; }
}

function ParseNumber(AText)
{
  return parseFloat(AText.replace(/,/g, ''));
}

// Строки итогов боя: "bmxcs получает 1,375 опыта, +0.4 очка ГТ и 2.76 умения."
function ParseFinalResult(AElem)
{
  var LResult = [];
  var LLines = AElem.innerHTML.split(/<br\s*\/?>/i);
  for (var i = 0; i < LLines.length; i++)
  {
    var LDiv = document.createElement('div');
    LDiv.innerHTML = LLines[i];
    var LText = Trim(LDiv.textContent);
    // "умения" / "умений" ("kchong получает 1,751 опыта и 0 умений.")
    var LMatch = /^(.+?) получает ([\d,]+) опыт\S*.*?([\d,.]+) умени[йяе]/.exec(LText);
    if (!LMatch)
      continue;
    LResult.push({
      Nick: Trim(LMatch[1]),
      Exp: ParseNumber(LMatch[2]),
      Ability: ParseNumber(LMatch[3]),
      GT: LText.indexOf('очка ГТ') > -1
    });
  }
  return LResult;
}

function IsGTBattle(ABattle)
{
  // Бой ГТ, если очки ГТ есть хоть у кого-то: проигравший может их не получить
  for (var j = 0; j < ABattle.Lines.length; j++)
    if (ABattle.Lines[j].GT)
      return true;
  return false;
}

// Сохраняет бой, бои держим отсортированными по warid (он растёт со временем)
function StoreBattle(AWarId, ALines)
{
  var LBattles = LoadBattles();
  for (var i = 0; i < LBattles.length; i++)
    if (LBattles[i].WarId == AWarId)
      return;
  LBattles.push({WarId: AWarId, Time: Date.now(), Lines: ALines});
  LBattles.sort(function(a, b) { return parseInt(a.WarId) - parseInt(b.WarId); });
  if (LBattles.length > GT_BATTLES_STORE)
    LBattles = LBattles.slice(LBattles.length - GT_BATTLES_STORE);
  GM_setValue(GT_BATTLES_KEY, JSON.stringify(LBattles));
}

function SaveBattleResult()
{
  var LElem = $('#finalresult_text');
  if (!LElem || !Trim(LElem.textContent))
    return false;
  var LWarId = URLAttrValueGet('warid', location.href);
  var LLines = ParseFinalResult(LElem);
  if (LWarId && LLines.length > 0)
    StoreBattle(LWarId, LLines);
  return true;
}

function WatchBattleResult()
{
  // Бои, открытые протоколом во фрейме, сохраняет сам протокол
  if (window.top !== window)
    return;
  var LTimer = setInterval(function() {
    if (SaveBattleResult())
      clearInterval(LTimer);
  }, 1000);
}

// Ник: тот, кто встречается в записанных боях чаще всех и есть на главной
function GetNick(ABattles)
{
  var LNick = GM_getValue('nick', '');
  if (LNick)
    return LNick;
  var LPageText = document.body.textContent;
  var LCounts = {};
  for (var i = 0; i < ABattles.length; i++)
    for (var j = 0; j < ABattles[i].Lines.length; j++)
    {
      var LName = ABattles[i].Lines[j].Nick;
      if (LPageText.indexOf(LName) > -1)
        LCounts[LName] = (LCounts[LName] || 0) + 1;
    }
  var LBest = '', LBestCount = 0;
  for (var LName in LCounts)
    if (LCounts[LName] > LBestCount)
    {
      LBest = LName;
      LBestCount = LCounts[LName];
    }
  return LBest;
}

function GetGTStats()
{
  var LBattles = LoadBattles();
  var LNick = GetNick(LBattles);
  if (!LNick)
    return null;
  var LExp = 0, LAbility = 0, LCount = 0;
  for (var i = LBattles.length - 1; i >= 0 && LCount < GT_BATTLES_AVG; i--)
  {
    if (!IsGTBattle(LBattles[i]))
      continue;
    for (var j = 0; j < LBattles[i].Lines.length; j++)
    {
      var LLine = LBattles[i].Lines[j];
      if (LLine.Nick == LNick)
      {
        LExp += LLine.Exp;
        LAbility += LLine.Ability;
        LCount++;
        break;
      }
    }
  }
  if (LCount == 0)
    return null;
  return {Nick: LNick, Count: LCount, Exp: LExp / LCount, Ability: LAbility / LCount};
}

// ------------------ бои ГТ

// ------------------ протокол боёв

// Фильтр протокола и винрейт - в отдельном скрипте hwm_warlog_filter_gm.user.js.
// Здесь только загрузка итогов боёв ГТ в базу.

var GT_TYPES_KEY = 'gt_types';
var SHARED_GT_TYPES_KEY = 'hwm_gt_types'; // для скрипта фильтра (общий localStorage страницы)
var GT_DEFAULT_TYPES = ['40'];             // тип боя из комментария <!--40--> в строке протокола
var WARLOG_PAGES = 5;          // сколько страниц протокола просматривать при обновлении
var BATTLE_LOAD_TIMEOUT = 30000;

function LoadGTTypes()
{
  try { return JSON.parse(GM_getValue(GT_TYPES_KEY, '[]')) || []; }
  catch (e) { return []; }
}

function IsGTType(AType, AGTTypes)
{
  return GT_DEFAULT_TYPES.indexOf(AType) > -1 || AGTTypes.indexOf(AType) > -1;
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
  // Скрипт фильтра оборачивает строки в span.hwm_ea_row - разворачиваем их обратно
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
    var LRow = {WarId: '', Type: ''};
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

// Типы боёв ГТ узнаём по уже записанным боям, в которых давали очки ГТ
function LearnGTTypes(ARows)
{
  var LTypes = LoadGTTypes();
  var LGT = {};
  var LBattles = LoadBattles();
  for (var i = 0; i < LBattles.length; i++)
    if (IsGTBattle(LBattles[i]))
      LGT[LBattles[i].WarId] = true;
  for (var i = 0; i < ARows.length; i++)
    if (ARows[i].Type && LGT[ARows[i].WarId] && LTypes.indexOf(ARows[i].Type) == -1)
      LTypes.push(ARows[i].Type);
  GM_setValue(GT_TYPES_KEY, JSON.stringify(LTypes));
  try { localStorage[SHARED_GT_TYPES_KEY] = JSON.stringify(LTypes); } catch (e) {}
  return LTypes;
}

function WarlogPageUrl(APage)
{
  return location.pathname + '?id=' + URLAttrValueGet('id', location.href) + '&page=' + APage;
}

// Итог боя берём из данных боя battle.php (их грузит сам war.php), без открытия боя во фрейме:
// "...h005f<font size="18"><b>Победившая сторона:</b></font><br />... получает ...<br />|#f_en..."
function LoadBattleResult(AWarId, ACallBack)
{
  var LRequest = new XMLHttpRequest();
  LRequest.open('GET', '/battle.php?warid=' + AWarId + '&lastturn=-1&lastmess=0&lastmess2=0&rand=' + Math.random(), true);
  LRequest.timeout = BATTLE_LOAD_TIMEOUT;
  LRequest.onloadend = function()
  {
    var LLines = null;
    var LText = LRequest.status == 200 ? LRequest.responseText : '';
    var LPos = LText.indexOf(' получает ');
    if (LPos > -1)
    {
      var LStart = LText.lastIndexOf('<font size="18">', LPos);
      if (LStart < 0)
        LStart = LText.lastIndexOf(';>', LPos) + 2;
      var LEnd = LText.indexOf('|', LPos);
      var LDiv = document.createElement('div');
      LDiv.innerHTML = LText.substring(LStart, LEnd < 0 ? LText.length : LEnd);
      LLines = ParseFinalResult(LDiv);
    }
    ACallBack(LLines);
  };
  LRequest.send(null);
}

function WarlogProcess()
{
  var LBox = FindWarlogBox(document);
  if (!LBox)
    return;

  LearnGTTypes(ExtractWarlogRows(LBox));

  var LPanel = document.createElement('div');
  LPanel.className = 'hwm_ea_panel';
  LPanel.innerHTML =
    '<button type="button" id="hwm_ea_reload">Обновить умку по боям ГТ</button> ' +
    'бои: <select id="hwm_ea_scope"><option value="gt">ГТ</option><option value="all">все</option></select> ' +
    'потоков: <select id="hwm_ea_parallel"><option>1</option><option>2</option><option>4</option>' +
      '<option>6</option><option>8</option></select> ' +
    '<span id="hwm_ea_status" class="hwm_ea_k"></span>';
  LBox.parentNode.insertBefore(LPanel, LBox);
  var LStatus = $('#hwm_ea_status');

  function ShowStats()
  {
    var LStats = GetGTStats();
    LStatus.innerHTML = LStats
      ? 'В базе ' + LStats.Count + ' боёв ГТ: ' + Math.round(LStats.Exp) + ' опыта, ' +
        LStats.Ability.toFixed(2) + ' умки за бой, соотношение ' + Math.round(LStats.Exp / LStats.Ability)
      : 'Боёв ГТ в базе нет';
  }

  // Собирает бои ГТ (или все) с нескольких страниц протокола и догружает их итоги
  function Reload()
  {
    var LAll = $('#hwm_ea_scope').value == 'all';
    if (LAll && !confirm('Будут открыты итоги всех боёв. Бои ГТ определятся по очкам ГТ. Продолжить?'))
      return;
    var LButton = $('#hwm_ea_reload');
    LButton.disabled = true;
    var LGTTypes = LoadGTTypes();
    var LStored = {};
    var LBattles = LoadBattles();
    for (var i = 0; i < LBattles.length; i++)
      LStored[LBattles[i].WarId] = true;

    var LQueue = [], LAllRows = [], LPage = 0;
    function NextPage()
    {
      if (LPage >= WARLOG_PAGES || LQueue.length >= GT_BATTLES_AVG)
        return NextBattle(0);
      LStatus.innerHTML = 'Читаю страницу протокола ' + (LPage + 1) + '...';
      Ajax('GET', WarlogPageUrl(LPage), null, function(AText) {
        var LDoc = new DOMParser().parseFromString(AText, 'text/html');
        var LPageBox = FindWarlogBox(LDoc);
        var LPageRows = LPageBox ? ExtractWarlogRows(LPageBox) : [];
        for (var i = 0; i < LPageRows.length && LQueue.length < GT_BATTLES_AVG; i++)
        {
          LAllRows.push(LPageRows[i]);
          if (!LStored[LPageRows[i].WarId] && (LAll || IsGTType(LPageRows[i].Type, LGTTypes)))
            LQueue.push(LPageRows[i].WarId);
        }
        LPage++;
        if (LPageRows.length == 0)
          LPage = WARLOG_PAGES;
        NextPage();
      });
    }
    // Бои грузятся в несколько фреймов одновременно
    var LLoaded = 0, LDone = 0, LNext = 0, LStartTime = 0;
    function NextBattle()
    {
      LStartTime = Date.now();
      var LParallel = Math.max(1, parseInt($('#hwm_ea_parallel').value) || 1);
      for (var i = 0; i < LParallel; i++)
        StartBattle();
      if (LQueue.length == 0)
        Finish();
    }
    function StartBattle()
    {
      if (LNext >= LQueue.length)
        return;
      var LWarId = LQueue[LNext++];
      LoadBattleResult(LWarId, function(ALines) {
        if (ALines && ALines.length)
        {
          StoreBattle(LWarId, ALines);
          LLoaded++;
        }
        LDone++;
        LStatus.innerHTML = 'Загружено ' + LDone + ' из ' + LQueue.length + ' (' +
          ((Date.now() - LStartTime) / 1000 / LDone).toFixed(1) + ' сек на бой)...';
        if (LDone >= LQueue.length)
          Finish();
        else
          StartBattle();
      });
    }
    function Finish()
    {
      LearnGTTypes(LAllRows);
      ShowStats();
      LStatus.innerHTML = 'Загружено боёв: ' + LLoaded + ' из ' + LQueue.length + '. ' + LStatus.innerHTML;
      LButton.disabled = false;
    }
    NextPage();
  }

  ShowStats();
  addEvent($('#hwm_ea_reload'), 'click', Reload);
  var LParallel = $('#hwm_ea_parallel');
  LParallel.value = GM_getValue('load_parallel', '4');
  if (LParallel.selectedIndex < 0)
    LParallel.value = '4';
  addEvent(LParallel, 'change', function() { GM_setValue('load_parallel', LParallel.value); });
}

// ------------------ протокол боёв

if (location.pathname.indexOf('/pl_warlog') === 0)
  WarlogProcess();
else if (location.pathname.indexOf('/war') === 0)
  WatchBattleResult();
else if (document.readyState === 'complete')
  MainProcess();
else
  addEvent(window, 'load', MainProcess);