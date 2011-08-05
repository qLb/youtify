/** EVENTS
 ****************************************************************************/

function deleteVideoButtonClicked(li) {
    var playlistElem = $('.playlistElem.selected'),
        playlist = playlistElem.data('model');

    playlist.deleteVideo(li.index());
    playlistManager.save();
    playlistElem.click(); // reload playlist
}

function playlistMouseDown(event) {
	$('#left-menu li').removeClass('selected');
	$(this).addClass('selected');
}

/**
 * Mark the playlistElem in the #left-menu as selected, then
 * fill #playlist with the contained videos.
 */
function playlistClicked(event) {
    $('#playlist').html('');

	$('#results-container ol').hide();
	$('#playlist').show();
	$('#playlist').data('owner', $(this));

    var playlist = $(this).data('model');

    $.each(playlist.videos, function(i, item) {
        var li = createResultsItem(item.title, item.videoId);
        li.data('additionalMenuButtons').push({
            title: 'Delete',
            li: li,
            callback: deleteVideoButtonClicked
        });
        li.addClass('droppable');
        li.addClass('draggable');
        li.addClass('reorderable');
        li.appendTo('#playlist');
    });
}

function shuffleButtonClicked(event) {
    if ($(this).hasClass('shuffle-on')) {
        setShuffle(false, $(this).parent());
        Player.addSiblingsToPlayorder($('#results-container li.playing, #results-container li.paused'), false);
    } else {
        setShuffle(true, $(this).parent());
        Player.addSiblingsToPlayorder($('#results-container li.playing, #results-container li.paused'), true);
    }
    event.stopPropagation();
}

/** MISC
 ****************************************************************************/

function setShuffle(enabled, playlistElem) {
	var playlist = playlistElem.data('model');
	playlist.shuffle = enabled;
	playlistManager.save();
	if (enabled) {
		$(playlistElem).find('.shuffle-off').addClass('shuffle-on');
		$(playlistElem).find('.shuffle-off').removeClass('shuffle-off');
	} else {
		$(playlistElem).find('.shuffle-on').addClass('shuffle-off');
		$(playlistElem).find('.shuffle-on').removeClass('shuffle-on');
	}
}

/** CLASS PLAYLIST
 ****************************************************************************/

function Playlist(title, videos, remoteId, isPrivate, shuffle) {
    this.title = title;
    this.videos = videos;
    this.remoteId = remoteId || null;
    this.isPrivate = isPrivate || false;
    this.shuffle = shuffle;

    this.rename = function(newTitle) {
        var title = $.trim(newTitle);
        if (title.length > 0 && title.length < 50) {
            this.title = newTitle;
        }
    };

    this.unsync = function(callback) {
        console.log("Unsyncing " + this.title);

        $.ajax({
            type: 'DELETE',
            url: '/playlists/' + this.remoteId,
            success: function() {
                if (callback) {
                    callback();
                }
            }
        });

        this.remoteId = null;
    };

    this.sync = function(callback) {
        var self = this,
            params = {
            'json': JSON.stringify(this.toJSON()),
        };

        if (this.remoteId) {
            $.post('/playlists/' + this.remoteId, params, function(data, textStatus) {
                if (textStatus === 'success') {
                    console.log(self.title + ' updated');
                } else {
                    alert('Failed to update playlist ' + self.title);
                }
                if (callback) {
                    callback();
                }
            });
        } else {
            $.post('/playlists', params, function(data, textStatus) {
                if (textStatus === 'success') {
                    console.log(self.title + ' = ' + data);
                    self.remoteId = data;
                } else {
                    alert('Failed to create new playlist ' + self.title);
                }
                if (callback) {
                    callback();
                }
            });
        }
    };

    this.addVideo = function(title, videoId) {
        if (typeof title !== 'string') {
            throw "title param must be string";
        }
        if (typeof videoId !== 'string') {
            throw "videoId param must be string";
        }

        this.videos.push({
            videoId: videoId,
            title: title,
        });
    };

    this.moveVideo = function(sourceIndex, destIndex) {
        var tmp;

        if (destIndex > sourceIndex) {
            destIndex -= 1;
        }

        tmp = this.videos.splice(sourceIndex, 1)[0];
        this.videos.splice(destIndex, 0, tmp);
    };

    this.deleteVideo = function(index) {
        this.videos.splice(index, 1);
    };

    this.toJSON = function() {
        return {
            title: this.title,
            videos: this.videos,
            remoteId: this.remoteId,
            isPrivate: this.isPrivate,
			shuffle: this.shuffle
        };
    };

    this.createListElem = function() {
        var li = $('<li/>')
            .addClass("playlistElem")
            .addClass('droppable')
            .addClass('draggable')
            .addClass('reorderable')
            .data('model', this)
            .text(this.title)
            .bind('contextmenu', showPlaylistContextMenu)
            .mousedown(playlistMouseDown)
            .click(playlistClicked);

        if (this.remoteId) {
            li.addClass('youtube');
        } else {
            li.addClass('local')
        }

        if (this.isPrivate) {
            li.addClass('private');
        }

        var shuffleButton = $('<button/>').click(shuffleButtonClicked);

        if (this.shuffle) {
            shuffleButton.addClass('shuffle-on');
        } else {
            shuffleButton.addClass('shuffle-off');
        }

        shuffleButton.appendTo(li);
        
        return li;
    };
};
