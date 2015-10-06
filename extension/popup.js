window.onload = function(){
	saveImage();
}

function saveImage() 
{
	chrome.windows.getCurrent(function(window)
	{
		chrome.tabs.getSelected(window.id, function(tab)
		{
			chrome.tabs.executeScript(tab.id, 
			{code:""				
			+ "var curDisplay = document.querySelector('#my-style-input').style.display;"								
			+ "if (curDisplay == 'none') {"
			+		"document.querySelector('#my-style-input').style.display = 'block';"
			+ "} else {"
			+		"document.querySelector('#my-style-input').style.display = 'none';"
			+ "}"
			});	
		});
	});
}