

chrome.runtime.sendMessage({type: "get-all-words"}, (response) => {
    console.log('收到消息',response)
    $('.total').text('共有：'+ response.length + ' 个生词')
    $('.words').text(response)
});