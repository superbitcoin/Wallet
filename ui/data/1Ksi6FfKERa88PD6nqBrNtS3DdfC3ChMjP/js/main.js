var isWalletLocked = false;
var i = 0;
var qrcode;
var over=false;

$(document).ready(function () {
    $("#menu li").click(function () {
        var $this = this;
        if ($(this).attr("id") == "icon05") {
            return;
        }
        $($('#menu li')).each(function (i, el) {
            var tab = $('.layout-right').eq(i);
            if ($this == el) {
                $($this).addClass('li-active');
                tab.addClass('tab-active');
            } else {
                $(el).removeClass('li-active');
                tab.removeClass('tab-active');
            }
        })
    });
    // $("#showHidden").click(function () {
    //     $(".layout1").hide();
    //     $("#layout").show();
    // });
    // var lan = $.cookie('language');
    // if (lan == undefined) {
    //     lan = jQuery.i18n.browserLang();
    // }
    // jQuery.i18n.properties({
    //     name: 'lan',
    //     path: 'lan/',
    //     mode: 'map',
    //     language: lan,
    //     callback: function () {
    //         $("[data-locale]").each(function () {
    //
    //             if ($(this).attr("type")) {
    //                 $(this).attr("value", $.i18n.prop($(this).data("locale")));
    //             } else {
    //                 $(this).html($.i18n.prop($(this).data("locale")));
    //             }
    //         });
    //     }
    // });

    $(".fixbutton-bg").visibility = false;
});

function swlan(str) {
    $.cookie('language', str);
    location.reload();
}

function ShowDiv(show_div, bg_div) {
    bg_div = "fade";
    document.getElementById(show_div).style.display = 'block';
    document.getElementById(bg_div).style.display = 'block';
    var bgdiv = document.getElementById(bg_div);
    bgdiv.style.width = document.body.scrollWidth;
    $("#" + bg_div).height($(document).height());
}

function CloseDiv(show_div, bg_div) {
    bg_div = "fade";
    document.getElementById(show_div).style.display = 'none';
    document.getElementById(bg_div).style.display = 'none';

    document.getElementById("singTx").innerHTML = "";
    document.getElementById("signResult").innerHTML = "";
    document.getElementById("signPwd").innerHTML = "";
}

function changePwd() {
    if (isWalletLocked) {
        ShowDiv("MyDiv0", "fade");
    } else {
        ShowDiv("MyDiv4", "fade");
    }
}

function smartNotice() {
    ShowDiv("MyDiv7", "fade");
}

$("#icon03").click(function () {
    Page.accountList();
});

$("#icon04").click(function () {
    Page.recordAddress(0);
});

function listAddress() {
    Page.accountList();
}

function showQR(address) {
    qrcode.makeCode(address);
}

function signMsg() {
    if (isWalletLocked) {
        // ShowDiv('MyDiv1', 'fade1');
        Page.walletPassPhrase(1);
    } else {
        // ShowDiv('MyDiv11', 'fade');
        Page.signMsg();
    }
}

function ShowMenu(){
    over = true;
    document.getElementById("menu").style.display = 'block';
}

function HidenMenu(){
    over=false;
    setTimeout(function () {
        if(!over){
            document.getElementById("menu").style.display = 'none';
        }
    }, 1000);
}

function dumpprivkey() {
    if (isWalletLocked) {
        ShowDiv('MyDiv16', 'fade1');
    } else {
        Page.dumpprivkey();
    }
}

function importPrikey() {
    if (isWalletLocked) {
        ShowDiv('MyDiv17', 'fade1');
    } else {
        Page.dumpprivkey();
    }
}

function timer() {
    i++;
}