/*!
  Slimbox v2.04 - The ultimate lightweight Lightbox clone for jQuery
  (c) 2007-2010 Christophe Beyls <http://www.digitalia.be>
  MIT-style license.
  
  Updates and maintenance by @kayluhb 2013
*/
(function ($) {
    // Global variables, accessible to Slimbox only
    var $win = $(window),
        options,
        images,
        activeImage = -1,
        activeURL,
        prevImage,
        nextImage,
        compatibleOverlay,
        middle,
        tarW,
        tarH,
        hiddenElements = [],
        documentElement = document.documentElement,
        // Preload images
        preload = {},
        preloadPrev = new Image(),
        preloadNext = new Image(),
        // DOM elements
        $overlay,
        $center,
        $image,
        $sizer,
        $prevLink,
        $nextLink,
        $bottomContainer,
        $bottom,
        $caption,
        $number;
    /*
        Initialization
    */
    $(function () {
        // Append the Slimbox HTML code at the bottom of the document
        $overlay = $('<div id="lb-overlay"></div>');
        $center = $('<div id="lb-center"></div>');
        $image = $('<div id="lb-image"></div>');
        $sizer = $('<div style="position:relative;" />');
        $image.append($sizer);
        $center.append($image);

        $bottomContainer = $('<div id="lb-bottom-container">').css({ display:'none' });
        $bottom = $('<div id="lb-bottom" class="clearfix"></div>');
        $caption = $('<div id="lb-caption"></div>');
        $number = $('<div id="lb-number"></div>');
        $prevLink = $('<a id="lb-prev-link" href="#"></a>');
        $nextLink = $('<a id="lb-next-link" href="#"></a>');
        $bottom.append($caption, $number, $prevLink, $nextLink);
        $bottomContainer.append($bottom);
        
        $('body').append($overlay, $center, $bottomContainer);

        $prevLink.click(previous);
        $nextLink.click(next);
        $overlay.click(close);
    });
    /*
        API
    */
    // Open Slimbox with the specified parameters
    $.slimbox = function (_images, startImage, _options) {
        options = $.extend({
            loop: false, // Allows to navigate between first and last images
            overlayOpacity: 0.8, // 1 is opaque, 0 is completely transparent (change the color in the CSS file)
            overlayFadeDuration: 400, // Duration of the overlay fade-in and fade-out animations (in milliseconds)
            resizeDuration: 200, // Duration of each of the box resize animations (in milliseconds)
            resizeEasing: "swing", // "swing" is jQuery's default easing
            initialWidth: 250, // Initial width of the box (in pixels)
            initialHeight: 250, // Initial height of the box (in pixels)
            imageFadeDuration: 400, // Duration of the image fade-in animation (in milliseconds)
            captionAnimationDuration: 300, // Duration of the caption animation (in milliseconds)
            counterText: "Image {x} of {y}", // Translate or change as you wish, or set it to false to disable counter text for image groups
            closeKeys: [27, 88, 67], // Array of keycodes to close Slimbox, default: Esc (27), 'x' (88), 'c' (67)
            previousKeys: [37, 80], // Array of keycodes to navigate to the previous image, default: Left arrow (37), 'p' (80)
            nextKeys: [39, 78], // Array of keycodes to navigate to the next image, default: Right arrow (39), 'n' (78)
            padding: 80 // The amount to pad the image when open.
        }, _options);
        // The function is called for a single image, with URL and Title as first two arguments
        if (typeof _images == "string") {
            _images = [
                [_images, startImage]
            ];
            startImage = 0;
        }
        middle = $win.scrollTop() + ($win.height() * 0.5);
        tarW = options.initialWidth;
        tarH = options.initialHeight;
        $center
            .css({
                top: Math.max(0, middle - (tarH * 0.5)),
                width: tarW,
                height: tarH,
                marginLeft: -tarW * 0.5
            })
            .show();

        compatibleOverlay = $overlay.currentStyle && ($overlay.currentStyle.position != "fixed");
        if (compatibleOverlay) {
            $overlay.css({ position: "absolute" });
        }

        $overlay
            .css("opacity", options.overlayOpacity)
            .fadeIn(options.overlayFadeDuration);
        position();
        setup(1);
        images = _images;
        options.loop = options.loop && (images.length > 1);
        return changeImage(startImage);
    };
    /*
    options:  Optional options object, see jQuery.slimbox()
    linkMapper: Optional function taking a link DOM element and an index as arguments and returning an array containing 2 elements:
        the image URL and the image caption (may contain HTML)
    linksFilter:  Optional function taking a link DOM element and an index as arguments and returning true if the element is part of
        the image collection that will be shown on click, false if not. "this" refers to the element that was clicked.
        This function must always return true when the DOM element argument is "this".
    */
    $.fn.slimbox = function (_options, linkMapper, linksFilter) {
        linkMapper = linkMapper || function (el) {
            return [el.href, el.title];
        };
        linksFilter = linksFilter || function () {
            return true;
        };
        var links = this;
        return links.off("click")
            .click(function () {
                // Build the list of images that will be displayed
                var link = this,
                    startIndex = 0,
                    filteredLinks, i = 0,
                    length;
                filteredLinks = $.grep(links, function (el, i) {
                    return linksFilter.call(link, el, i);
                });
                // We cannot use jQuery.map() because it flattens the returned array
                for (length = filteredLinks.length; i < length; ++i) {
                    if (filteredLinks[i] == link) startIndex = i;
                    filteredLinks[i] = linkMapper(filteredLinks[i], i);
                }
                return $.slimbox(filteredLinks, startIndex, _options);
            });
    };
    /*
        Internal functions
    */
    function position() {
        
    }

    function setup(open) {
        if (open) {
            $("object")
                .add("embed")
                .each(function (index, el) {
                hiddenElements[index] = [el, el.style.visibility];
                el.style.visibility = "hidden";
            });
        } else {
            $.each(hiddenElements, function (index, el) {
                el[0].style.visibility = el[1];
            });
            hiddenElements = [];
        }
        var fn = open ? "on" : "off";
        $win[fn]("scroll resize", position);
        $(document)[fn]("keydown", keyDown);
    }

    function keyDown(event) {
        var code = event.keyCode,
            fn = $.inArray;
        // Prevent default keyboard action (like navigating inside the page)
        return (fn(code, options.closeKeys) >= 0) ? close() : (fn(code, options.nextKeys) >= 0) ? next() : (fn(code, options.previousKeys) >= 0) ? previous() : false;
    }

    function previous() {
        return changeImage(prevImage);
    }

    function next() {
        return changeImage(nextImage);
    }

    function changeImage(imageIndex) {
        if (imageIndex >= 0) {
            activeImage = imageIndex;
            activeURL = images[activeImage][0];
            prevImage = (activeImage || (options.loop ? images.length : 0)) - 1;
            nextImage = ((activeImage + 1) % images.length) || (options.loop ? 0 : -1);
            stop();
            $center[0].className = "lb-loading";
            preload = new Image();
            preload.onload = animateBox;
            preload.src = activeURL;
        }
        return false;
    }

    function animateBox() {
        
        $center.className = "";
        var $img = $image;

        $img.css({
            backgroundImage: "url(" + activeURL + ")",
            visibility: "hidden",
            display: ""
        });
        $sizer
            .width(preload.width)
            .height(preload.height);
        $caption
            .html(images[activeImage][1] || "");
        $number
            .html((((images.length > 1) && options.counterText) || "")
            .replace(/\{x\}/, activeImage + 1)
            .replace(/\{y\}/, images.length));
        if (prevImage >= 0) {
            preloadPrev.src = images[prevImage][0];
        }
        if (nextImage >= 0) {
            preloadNext.src = images[nextImage][0];
        }
        var maxH = $win.height() - options.padding,
            maxW = $win.width() - options.padding;
        tarW = $image[0].offsetWidth;
        tarH = $image[0].offsetHeight;

        if (tarH > maxH) {
            tarW = tarW * (maxH / tarH);
            tarH = maxH;
        }
        if (tarW > maxW) {
            tarH = tarH * (maxW / tarW);
            tarW = maxW;
        }
        var top = Math.max(0, middle - (tarH * 0.5)) - 20;
        if ($center[0].offsetHeight != tarH) {
            $center
                .animate({
                    height: tarH,
                    top: top
                }, options.resizeDuration, options.resizeEasing);
        }
        if ($center[0].offsetWidth != tarW) {
            $center
                .animate({
                    width: tarW,
                    marginLeft: -tarW * 0.5
                }, options.resizeDuration, options.resizeEasing);
        }
        $center
            .queue(function () {
                $bottomContainer
                    .css({
                        width: tarW,
                        top: top + tarH,
                        marginLeft: -tarW * 0.5,
                        visibility: "hidden",
                        display: ""
                    });
                $img.css({
                        backgroundSize: tarW + "px " + tarH + "px",
                        display: "none",
                        visibility: "",
                        opacity: ""
                    })
                    .fadeIn(options.imageFadeDuration, animateCaption);
            });
    }

    function animateCaption() {
        if (prevImage >= 0) {
            $prevLink
                .show();
        }
        if (nextImage >= 0) {
            $nextLink
                .show();
        }
        $bottom
            .css("marginTop", -$bottom[0].offsetHeight)
            .animate({
            marginTop: 0
        }, options.captionAnimationDuration);
        $bottomContainer.css({ visibility: ""});
    }

    function stop() {
        preload.onload = null;
        preload.src = preloadPrev.src = preloadNext.src = activeURL;
        
        $center.stop();
        $image.stop();
        $bottom.stop();
        
        $prevLink.hide();
        $nextLink.hide();
        $image.hide();
        $bottomContainer.hide();
    }

    function close() {
        if (activeImage >= 0) {
            stop();
            activeImage = prevImage = nextImage = -1;
            $center
                .hide();
            $overlay
                .stop()
                .fadeOut(options.overlayFadeDuration, setup);
        }
        return false;
    }
})(jQuery);
