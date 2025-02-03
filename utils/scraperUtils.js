async function autoScroll(page, scrollFeed) {
    await page.evaluate(async (scrollFeed) => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 1000;
            var scrollDelay = 3000;

            async function scroll() {
                var wrapper = document.querySelector(scrollFeed);
                if (!wrapper) {
                    console.error(`Element ${scrollFeed} not found`);
                    resolve();
                    return;
                }
                var scrollHeightBefore = wrapper.scrollHeight;
                wrapper.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeightBefore) {
                    totalHeight = 0;
                    await new Promise((resolve) => setTimeout(resolve, scrollDelay));

                    var scrollHeightAfter = wrapper.scrollHeight;

                    if (scrollHeightAfter > scrollHeightBefore) {
                        scroll();
                    } else {
                        resolve();
                    }
                } else {
                    setTimeout(scroll, 200);
                }
            }

            scroll();
        });
    }, scrollFeed);
}

module.exports = { autoScroll };
