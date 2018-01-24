class SbtcChat extends Frame
  init: ->
    @addLine "初始化成功"

  addLine: (line) ->
    messages = document.getElementById("messages")
    messages.innerHTML = "<li>#{line}</li>" + messages.innerHTML

# Wrapper websocket 链接建立完成
  onOpenWebsocket: (e) =>
    @cmd "serverInfo", {}, (server_info) =>
      @addLine "服务器信息: <pre>" + JSON.stringify(server_info, null, 2) + "</pre>"
#    @cmd "siteInfo", {}, (site_info) =>
#      @addLine "站点信息: <pre>" + JSON.stringify(site_info, null, 2) + "</pre>"

#  handleSendInputData: (e)=>
#    input_data = document.getElementById("message")
#    $('.send').bind 'click', (event) =>
#      @cmd "siteInfo", {input_data}, (site_info) =>
#      @addLine "站点信息: <pre>" + JSON.stringify(site_info, null, 2) + "</pre>"

  sendMsg: ()=>
    input_data = document.getElementById("message").value
    @cmd "siteInfo", [input_data], (site_info) =>
      @addLine "站点信息: <pre>" + JSON.stringify(site_info, null, 2) + "</pre>"


  getBalance: ()=>
    @cmd "walletGetBalance", ["address","SBTC"], (balance) =>
      document.getElementById("balance").innerHTML = balance.result

  getAddress: ()=>
    document.getElementById("address").innerHTML = "asdfjiwejofisjdfoij"


window.Page = new SbtcChat()