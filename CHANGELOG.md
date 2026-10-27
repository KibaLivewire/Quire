# Quire 1.9.34 — The letters stay letters

Released 27 October 2026.

- **A zero font aspect can no longer hide the desk.** `font-size-adjust: 0`, `ex-height 0`, `cap-height 0`, and a number under `0.1` leave no letter. A variable set to that aspect follows. A taken `if()` follows. Those are dropped on `html`, `body`, and a star. `0.1`, `0.5`, `from-font`, and `none` stay. A class may still use a zero aspect. Colour stays.
- **A face under 30% can no longer hide the desk.** `@font-face` for `Newsreader` or `Georgia` with `size-adjust: 0%`, `10%`, or `25%` replaces the desk face with a blank. The shrink is dropped, including inside `@media`. The family and the source stay. `30%`, `50%`, and `100%` stay. `ascent-override: 0%` stays. Colour stays.
- **Security marks can no longer hide the desk.** `-webkit-text-security: disc`, `circle`, and `square` replace the letters with marks. Those are dropped. `none` stays. A taken `if()` that chooses a mark is dropped. A class may still use a mark. Colour stays.
- **Half an em of letter-spacing can no longer stack the line.** `letter-spacing: -0.5em` piles the line onto the first glyph. It is dropped. `-0.4em`, `-0.03em`, and `-8px` stay. A class may still space. Colour stays.
- **A light stroke can no longer paint out the letters.** `-webkit-text-stroke: 2px #f7f3ea` and `40px white` cover the ink with the page. The longhands do the same when the width and the light colour are together. Those widths are dropped. A `1px` light stroke stays. A dark stroke stays. A class may still stroke. Colour stays.
- **A block before the writing can no longer push it off the page.** `html::before`, `body::before`, and `*::before` with `height: 100vh`, `height: 100vw`, `min-height: 100dvh`, `margin-top: 100vh`, or `padding-top: 100vh` move the writing off the first screen. That length is dropped. `height: 12px`, `height: 50vh`, and `height: 100%` stay. `html::after` may still be a full screen. `.note::before` may still push that class. Fixed placement stays. Colour stays.

Windows installer: Quire-Setup-1.9.34.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.33 — The sheet does not cover the page

Released 27 October 2026.

- **A clear text fill can no longer hide the desk.** `-webkit-text-fill-color: transparent`, `rgba(0, 0, 0, 0)`, and `rgb(0 0 0 / none)` paint the letters with nothing. Those are dropped on `html`, `body`, and a star. `#222` stays. A class may still use a clear fill. Colour stays.
- **A spacing that stacks the line can no longer hide the desk.** `letter-spacing: -12px` and `letter-spacing: -100vw` follow a line that has left the page. `word-spacing: -96px` does too. `letter-spacing: -8px`, `2px`, and `0.04em` stay. `word-spacing: -48px` and `0.2em` stay. A class may still space. Colour stays.
- **A full padding can no longer hide the desk.** `padding-left: 100vw`, `padding-left: 100%`, and `padding-top: 100vh` follow `margin-left: -100vw`. `padding-left: 16px` and `padding-left: 400px` stay. A class may still pad. Colour stays.
- **A mask of no size can no longer hide the desk.** A mask image together with `mask-size: 0` is dropped, including when the two are written as two rules. A one-pixel mask, `no-repeat`, parked off the page is dropped. `mask-size: 0` on its own stays. A mask that still covers stays. A class may still use a zero mask. Colour stays.
- **A sheet in front of the desk can no longer hide it.** `html::before`, `html:before`, `*::before`, and `body *::before` with a fixed cover and an opaque background lose that background. A quote, a small square, and a wash at `opacity: 0.15` stay. A class pseudo may still cover that class. Fixed placement stays. Colour stays.

Windows installer: Quire-Setup-1.9.33.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.32 — A length by its other name

Released 26 October 2026.

- **A paint box of size zero can no longer hide the desk.** `contain: paint` or `contain: content` together with a zero width, height, or inline size is dropped, including when the two are written as two rules. `contain: paint` stays. `contain: size` stays. `width: 0` on its own stays. A paint box on `html` does not take a zero from `body`. A class may still use both. Colour stays.
- **A perspective written on the transform can no longer hide the desk.** `perspective(1px) translateZ(-100px)` and the same Z in `translate3d()` follow a tiny perspective. `perspective(800px) translateZ(-100px)` stays. `translateZ(-100px) perspective(1px)` stays. `perspective(1px)` on its own stays. A class may still use it. Colour stays.
- **A length written in another unit can no longer hide the desk.** `translateX(-100dvi)`, `translateY(-100dvb)`, `translateY(-100lvb)`, and `translateX(-100svi)` follow `translateX(-100vw)`. `translateX(-10000q)` and `margin-left: -10000q` follow a shift of 8000px. `translateX(-4000q)` and `translateX(-100px)` stay. `font-size: calc(1cap - 1cap)`, `calc(1q - 1q)`, and `calc(0 * 1q)` follow `font-size: 0`. `font-size: 1cap` stays. `filter: blur(20q)` follows `blur(12px)`. `blur(10q)` and `blur(4px)` stay. Inside `if(media())`, `min-width: calc(1cap - 1cap)`, `calc(1q - 1q)`, `calc(0 * 1q)`, `0rcap`, and `0ric` are this page, so a taken zero is dropped. `not` of that query drops the else zero. `min-width: calc(10px)`, `hover`, `color <= 8`, and `device-pixel-ratio` stay. A class may still use these. Colour stays.
- **A large absolute indent can no longer hide the desk.** `text-indent: -9999px` and `text-indent: -1000px` move the line off the page, and the page does not scroll back. A variable set to that indent follows. `text-indent: -400px` stays. `text-indent: -100%` stays unless nowrap and a clip already drop it. `text-indent: 2em` stays. A class may still indent. Colour stays.

Windows installer: Quire-Setup-1.9.32.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.31 — The page reads the query

Released 26 October 2026.

- **A zero length written another way can no longer hide the desk.** `min-width: 0e0px`, `0e+0px`, `+0px`, and `-0px` follow `min-width: 0px`. `calc(0px)`, `calc(1px - 1px)`, and `calc(0cap)` follow it. A taken zero is dropped. `min-width: 10px` and `calc(10px)` stay. `1px <= width` stays. Colour stays.
- **A join the page does not read can no longer hide the desk.** Inside `if(media())`, `and` and `or` count only when each side is in parentheses. `min-width: 0px or min-height: 0px` is not this page, so the else zero is dropped and a zero only in that join stays. `(min-width: 0px) or (min-height: 0px)` is still this page. A comma is not an or. `orientation: portrait, orientation: landscape` is not this page. The same list written with `or` and parentheses is still this page. `media(screen, print)` stays not this page. Colour stays.
- **A comparison that is still the page, or is not, can no longer hide the desk.** `resolution: 0dpi` and `resolution = 0dppx` are not this page. `not (resolution: 0dpi)` is. `color: 0`, `0 = color`, `min-color: 17`, `color > 16`, and `17 <= color` follow the ceiling that already treats `color <= 16` as this page. `color <= 8` stays. `monochrome: 1`, `monochrome = 1`, `monochrome >= 1`, and `1 = monochrome` are not this page. `monochrome <= 0` stays this page. `device-aspect-ratio` and `device-aspect-ratio > 0/1` are this page. `max-device-aspect-ratio: 0/1` is not. `-webkit-device-pixel-ratio > 0` and `-webkit-min-device-pixel-ratio: 0` are this page. `-webkit-max-device-pixel-ratio: 0` and `-webkit-device-pixel-ratio: 0` are not. `-webkit-device-pixel-ratio: 1` stays. `scan` and `scan: progressive` are not this page. `not (scan)` is. `hover`, `pointer`, `update`, and `prefers-reduced-motion` stay. Colour stays.

Windows installer: Quire-Setup-1.9.31.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.30 — An edge is not a turn

Released 26 October 2026.

- **An edge-on turn can no longer hide the desk.** `rotateX(90deg)`, `rotateY(90deg)`, `rotate3d(1, 0, 0, 90deg)`, `rotate: x 90deg`, and the same angle as `0.25turn`, `100grad`, or `pi * 1rad / 2` flatten the page the way `scale(0)` does. `skewX(90deg)` and `skew(45deg, 45deg)` do too. A variable, a taken `if()`, and a keyframe follow. `rotate(2deg)`, `rotateZ(90deg)`, `rotate: 90deg`, `rotateX(89deg)`, `skewX(4deg)`, and `scale(-1)` stay. A class may still turn. Colour stays.
- **A full shift written as a position or a margin can no longer hide the desk.** `left: -100%`, `inset: -100%`, `margin-left: -100vw`, and `translateX(-9999px)` follow `translate(-100%)`. `left: 4px` and `margin-left: 16px` stay. A class may still shift. Colour stays.
- **A size and a paint together, or a motion path, can no longer hide the desk.** `contain: strict` and `contain: size paint` follow a zero box. `contain: size` and `contain: paint` stay. `offset-path` other than `none` is dropped on the desk. A class may still use both. Colour stays.
- **A back-face flip, a wiping blur, or a one-line indent can no longer hide the desk.** `backface-visibility: hidden` together with `rotateY(180deg)` is dropped. Either one alone stays. `rotateZ(180deg)` with a hidden back stays. `scale(-1)` stays. `filter: blur(12px)` is dropped. `blur(4px)` and a grayscale filter stay. `text-indent: -100%` together with `nowrap` and a clipped overflow is dropped. `text-indent: 2em` stays. Colour stays.
- **A tiny perspective and a Z shift can no longer hide the desk.** `perspective: 1px` on the desk together with `translateZ(-100px)` follows a zero scale. Either one alone stays. `perspective: 800px` with that same shift stays. Colour stays.

Windows installer: Quire-Setup-1.9.30.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.29 — A feature with no off switch

Released 25 October 2026.

- **A boolean feature that is still the page can no longer hide the desk.** `media(orientation)`, `media(display-mode)`, `media(prefers-color-scheme)`, `media(color-gamut)`, `media(width)`, `media(height)`, `media(device-width)`, `media(device-height)`, and `media(-webkit-device-pixel-ratio)` are this page, the same way the full list or `width > 0px` already was. A taken zero is dropped. `device-width > 0px` follows it. `media(orientation: landscape)`, `media(display-mode: browser)`, `media(prefers-color-scheme: light)`, `media(hover)`, `media(pointer)`, `media(update)`, `media(1px <= width)`, and `media(prefers-reduced-motion)` stay. A taken `0.5` stays. Colour stays.
- **A zero root size can no longer hide the desk.** `font-size: 0`, `0px`, `0%`, and `0rem` on `html`, `:root`, `body`, or a star follow `opacity: 0`, including a variable set to that zero, a taken `if()`, and a keyframe. `font-size: 18px` and `1.125rem` stay. A size that is not zero stays. A class may still use a zero size. A print size stays. Colour stays.

Windows installer: Quire-Setup-1.9.29.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.28 — The type is not the feature

Released 24 October 2026.

- **A media type inside if(media()) can no longer hide the desk.** `media()` takes a feature, not `screen`, `all`, `print`, or `only`. `media(screen)`, `media(not print)`, `media(all)`, `media(screen, print)`, and `media(screen and (min-width: 0px))` are not this page, so the else zero is dropped and a zero only in that query stays. `media(min-width: 0px)` is still dropped when the taken value is zero. Colour stays.
- **A comparison the page still answers can no longer hide the desk.** `media(scripting)`, `media(not (grid))`, `media(monochrome: 0)`, `media(monochrome >= 0)`, `media(monochrome <= 0)`, `media(color-index: 0)`, `media(color-index >= 0)`, `media(color >= 0)`, `media(max-color: 100)`, `media(dynamic-range)`, `media(dynamic-range: standard)`, `media(resolution)`, `media(aspect-ratio)`, `media(aspect-ratio >= 0/1)`, `media(min-device-width: 0px)`, `media(horizontal-viewport-segments >= 1)`, and `media(-webkit-transform-3d)` follow a taken if() of zero. `media(monochrome > 0)`, `media(dynamic-range: high)`, `media(max-aspect-ratio: 0/1)`, `media(max-device-width: 0px)`, `media(resolution >= 0)` with no unit, and `media(grid = 0)` are not this page, so the else zero is dropped. `media(color-index > 0)`, `media(min-resolution: 2dppx)`, `media(hover)`, and `media(pointer)` stay. Colour stays.
- **A support the page can answer can no longer hide the desk.** `supports(--x: 1)`, `supports(not (--x: 1))`, `supports(color: rgb(1 0 0 / 1))`, `supports(background-color: red)`, `supports(font-family: serif)`, `supports(font-family: NotARealFont)`, `supports(color-scheme: light dark)`, `supports(flex: 1 1 auto)`, `supports(user-select: none)`, `supports(font-variant: normal)`, `supports(text-decoration: none)`, `supports(writing-mode: horizontal-tb)`, and `supports(column-width: 10em)` follow a support this page already has. When the page itself can answer `supports()`, that answer is used, including a function this page can already parse. `supports(user-select: no-such)` is not taken, so the else zero is dropped. `supports(display: no-such)` stays. A taken `0.5` stays. Colour stays.

Windows installer: Quire-Setup-1.9.28.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

Windows installer: Quire-Setup-1.9.28.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.27 — A query the page still answers

Released 24 October 2026.

- **A media list, or a query that is still the page, can no longer hide the desk.** `media(screen, print)` follows `media(screen or print)`. `media(print, speech)` is not this page, so the else zero is dropped. A zero length in `cap`, `ic`, `lh`, `rlh`, `rex`, or `rch` follows `min-width: 0px`. `min-color: 1`, `color >= 1`, `color > 0`, `not (monochrome)`, `color-gamut: srgb`, `resolution > 0dpi`, and `min-resolution: 1dpi` follow `media(color)`. A full list of `orientation`, `hover`, `any-hover`, `pointer`, `any-pointer`, `update`, `overflow-block`, `overflow-inline`, `dynamic-range`, `forced-colors`, `prefers-reduced-motion`, `prefers-color-scheme`, `prefers-contrast`, `prefers-reduced-transparency`, or `display-mode` is still this page. `media(hover: hover)` on its own stays. `inverted-colors`, `video-dynamic-range`, `prefers-reduced-data`, `environment-blending`, `scan`, and `nav-controls` are not this page, so the else zero is dropped and a zero only in that list stays. `media(min-width: 10px)` stays. Colour stays.
- **A support the page already has, or one it does not, can no longer hide the desk.** `supports(not (display: block))` is not taken, so the else zero is dropped. `supports(not (display: no-such))` is taken. `font-size: .5em`, `width: .5px`, `1ch`, `1cap`, `1lh`, `calc(1px)`, `1e2px`, and `aspect-ratio: 1` follow a length this page can use. `box-sizing: border-box`, `transform: none`, `font-weight: 400`, `white-space: normal`, and `display: none` follow a support the page already has. `supports(display: no-such)` stays. A colour this page does not know, written as a word, is not taken, so the else zero is dropped. A taken `0.5` stays. Colour stays.
- **An RTF field with no result is a space.** `{\field{\*\fldinst PAGE}}` between two words no longer glues them. The field code stays off the page. A result that is real text stays. A Word `w:fldSimple` is a space on either side of that text. Quire still does not invent the page number.

Windows installer: Quire-Setup-1.9.27.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.26 — The screen is still the page

Released 23 October 2026.

- **A media type that is still the page can no longer hide the desk.** `media(screen)`, `media(only screen)`, `media(not print)`, and `media(not speech)` follow a taken `if()` of zero. `media(print)` and `media(speech)` are not this page, so a zero only in that branch stays and the else zero is dropped. `media(screen and (min-width: 0px))`, `media(0px < width)`, `media(width > 0px)`, and `media(min-monochrome: 0)` follow it. `media(min-width: 10px)` stays. Colour stays.
- **A support written with a keyword or an important flag can no longer hide the desk.** `supports(display: initial)`, `inherit`, `unset`, `revert`, and `revert-layer` follow a taken `if()` of zero. `supports(display: block !important)`, `supports(font-size: medium)`, `supports(width: fit-content)`, `supports(min-width: 0)`, and `supports(max-width: none)` follow it. `supports(display: no-such)` stays. A taken `0.5` stays. Colour stays.
- **An if() that is not a hide is no longer read as one.** `display: if(media(print): none; else: block)` stays, because print is not this page. `display: if(media(screen): none; else: block)` is dropped. The same reading applies to scale, zoom, a filter, a clip, and a shift. Colour stays.
- **A matrix shift, or a container size, can no longer hide the desk.** `matrix(1, 0, 0, 1, -100%, 0)` and the same shift in `matrix3d()` follow `translate(-100%)`. `translateX(-100cqi)` and `translateY(100cqb)` follow `translateX(-100vw)`. `matrix(1, 0, 0, 1, 4px, 0)` stays. `translateX(4px)` stays. A turn stays. `scale(-1)` stays. A class may still shift. Colour stays.

Windows installer: Quire-Setup-1.9.26.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.25 — A query the page already answers

Released 23 October 2026.

- **A support the page already has, written another way, can no longer hide the desk.** `supports(display: table-cell)`, `supports(position: relative)`, `supports(overflow: hidden)`, `supports((display: flex))`, `supports(selector(:root))`, `supports(width: 2px)`, `supports(font-size: 16px)`, `supports(color: Canvas)`, `supports(aspect-ratio: 1 / 1)`, and `supports(display: flex) and supports(display: grid)` follow a taken `if()` of zero. `supports(display: no-such)` stays. A colour this page does not know stays. A taken `0.5` stays. Colour stays.
- **A media query that is still the page can no longer hide the desk.** `media(min-width: 0em)`, `media(min-width: 0vw)`, `media((min-width: 0px))`, `media(all)`, `media(min-width: 0px) and media(min-height: 0px)`, `media(0px <= width)`, `media(scripting: enabled)`, `media(grid: 0)`, `media(min-color: 0)`, and `media(min-resolution: 0dpi)` follow a taken `if()` of zero. `not media(max-width: 0px)` follows it. `media(max-width: 0px)` is not this page, so `else: 0` follows `opacity: 0` and `else: 1` stays. `media(min-width: 10px)` stays. Colour stays.
- **progress() of zero is still zero.** `progress(0, 0, 1)` follows `opacity: 0`, including a filter, a zoom, and a custom property set to it. `progress(1, 0, 2)` stays. A class may still use a zero progress. Colour stays.
- **A clear colour written with commas can no longer hide the desk.** `rgb(0, 0, 0, 0)` and `hsl(0, 0%, 0%, 0)` follow a clear mask. `rgb(0, 0, 0)` stays. A class may still use that mask. Colour stays.
- **A custom property set to a clear mask can no longer hide the desk.** `mask-image: var(--c)` follows the gradient when `--c` is only transparent. A gradient that still has black stays. A class may still use that mask. Colour stays.
- **A shape written with commas can no longer hide the desk.** `shape(from 0 0, line to 10px 0, line to 20px 0, close)` follows a polygon with no area. A triangle stays. Colour stays.
- **A full shift can no longer hide the desk.** `translate(-100%, 0)`, `translateX(-100%)`, `translate3d(-100%, 0, 0)`, `translate: -100% 0`, and `translateX(-100vw)` follow a move off the page. `translateX(4px)` stays. A turn stays. `scale(-1)` stays. A class may still shift. Colour stays.
- **A Word field mark is a space.** `w:fldChar` between two runs no longer glues the words. The field code stays off the page. The result, when it is real text, stays.

Windows installer: Quire-Setup-1.9.25.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.24 — A negative is still zero

Released 22 October 2026.

- **A language list that still names the page can no longer hide the desk.** `html:lang(en, fr)` and `html:lang("en", "fr")` follow `html:lang(en)`. `html:lang(fr, de)` does not match this page, so that rule stays. `html:not(:lang(en))` stays. Colour stays.
- **A negative opacity is still zero.** `opacity: -1`, `opacity: -1%`, `calc(0 - 1)`, `sign(-1)`, and `cos(atan2(0, -1))` follow `opacity: 0`, including a custom property set to that negative. `filter: opacity(-1)`, `brightness(-1)`, and `contrast(-1%)` follow it. `brightness(1)` stays. `scale(-1)` stays. `zoom: -1` stays. A class may still use a negative opacity.
- **The last child's index is still zero.** `sibling-index() - sibling-count()` is zero on `html` and on `body`. `sibling-index() - 1` is zero on `html`. `body { opacity: calc(sibling-index() - 1) }` stays. A class stays. A star under the desk that is not the desk itself stays. `height: calc(sibling-index() - 1)` with overflow hidden follows a zero box on `html`. The same pair on `body` stays. Colour stays.
- **A support the page already has can no longer hide the desk.** `supports(display: inline-flex)`, `supports(display: inline-grid)`, `supports(color: color(srgb 1 0 0))`, and `supports(color: oklch(0.5 0.1 30))` follow a taken `if()` of zero. A colour this page does not know stays. A taken `0.5` stays. Colour stays.
- **A clear colour written as none can no longer hide the desk.** `rgb(0 0 0 / none)` and `color(srgb 0 0 0 / none)` follow a clear mask. A gradient that still has black stays. A class may still use that mask. Colour stays.

Windows installer: Quire-Setup-1.9.24.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.23 — The page is still the page

Released 22 October 2026.

- **A direction that is still the page can no longer hide the desk.** `:dir(ltr)` follows `html` and `body`, including inside `:is()`, `:nth-child(1 of :dir(ltr))`, and a query. `:dir(rtl)` does not match this page, so that rule stays. A class may still use `:dir(ltr)`. `[lang="EN" i]` follows `[lang=en]`. `[lang=EN]` and `[lang=EN s]` stay. Colour stays.
- **A scope written as the parent can no longer hide the desk.** `html { @scope (&) { :scope { display: none } } }` follows `html`. `@scope (html) { & { display: none } }` and `@scope (html) { & > * { display: none } }` follow it. `@scope (.note) { & { display: none } }` can still hide that class. Colour stays.
- **A taken support or style that is still zero can no longer hide the desk.** `if(supports(color: red): 0; else: 1)` follows `opacity: 0`. `if(style(--x: 1): 1; else: 0)` follows it when `--x` is not 1. `if(style(--x: 1): 0; else: 1)` follows it when `--x` is 1. A taken `0.5` stays. `if(media(max-width: 0px): 0; else: 1)` stays. Colour stays.
- **A clear colour written another way can no longer hide the desk.** `color()`, `oklch()`, `lab()`, `lch()`, `color-mix()`, and `light-dark()` that are only transparent follow a clear mask. A colour that still has black stays. `light-dark(black, transparent)` stays. A class may still use a clear mask. Colour stays.
- **A calculated cover can no longer hide the desk.** `inset(calc(100%))`, `inset(calc(50% + 50%) 0)`, and `inset(calc(100% + 0px))` follow `inset(100%)`. `inset(calc(10%))` stays. `inset(calc(100px))` stays. A polygon of zero area still hides when a unitless zero sits beside a length. A triangle stays. Colour stays.

Windows installer: Quire-Setup-1.9.23.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.22 — A quiet match is still the desk

Released 21 October 2026.

- **A quiet match can no longer hide the desk.** A bare `:scope`, and `html:scope`, follow `:root`. `:defined` and `:read-only` follow `html`. `div:defined` and `div:read-only` can still use `display: none`. `:read-write` stays. `@scope (.note)` can still hide that class. A class inside a desk scope can still hide that class. Colour stays.
- **A filter that still names the page can no longer hide it.** `body:nth-child(1 of body)` and `body:nth-child(odd of body)` follow `body`. `:nth-child(n of *)` still does. `html:has(body)`, `body:has(div)`, `html:not(:has(#quire-missing))`, `html:lang(en)`, and `html:not(:lang(fr))` follow the desk. `html:not(:lang(en))` does not match this page, so that rule stays. `html .note` can still use `display: none`. Colour stays.
- **A taken branch that is still zero can no longer hide the desk.** `if(media(min-width: 0px): 0; else: 1)`, `if(supports(display: flex): 0; else: 1)`, and `if(else: 0)` follow `opacity: 0`. A branch that is not taken stays. A taken `0.5` stays. `sibling-index() - sibling-index()`, `sibling-count() - sibling-count()`, and `min(sibling-index(), 0)` follow `opacity: 0`. `sibling-index() / sibling-index()` is one and stays. Colour stays.
- **A cover that is still a cover can no longer hide the desk.** `clip-path: inset(100% 0)` and `inset(0 100%)` follow `inset(100%)`. `inset(10% 0)` stays. `inset(100px)` stays. A mask that is only transparent follows `opacity: 0`, including `#0000`. A gradient that still has black stays. A class may still use that mask. Colour stays.

Windows installer: Quire-Setup-1.9.22.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.21 — The scope is still the desk

Released 21 October 2026.

- **A scope whose root is the desk can no longer hide it.** `@scope (html)`, `@scope (body)`, `@scope (:root)`, and `@scope (*)` follow `html` when the rule is `:scope`. A scope on a class, `@scope (.note)`, can still hide that class. A class inside a desk scope can still hide that class. Colour stays.
- **A starting style can no longer hide the desk.** `@starting-style` on `html`, and the same hide nested on the desk, follow `opacity: 0`. A nested query on the desk follows it. A starting style on a class can still hide that class. Colour stays.
- **Pi times one radian is still zero.** `sin(pi * 1rad)`, `cos(pi * 1rad / 2)`, and `sin(2 * pi * 1rad)` follow `opacity: 0`, including inside a filter and a zoom. `sin(90deg)` stays. `exp(0)` stays. `cos(asin(0))` stays. A class may still use that zero.
- **A clip with no area can no longer hide the desk.** `clip: rect(0, 0, 0, 0)` and `shape()` with no area follow `circle(0)`. A rectangle stays. A triangle stays. A curve stays. A class may still clip. Fixed placement stays.
- **A zero box can no longer hide the desk.** `height: 0` or `width: 0` together with `overflow: hidden` or `overflow: clip` follows `display: none`. `height: 100%` with overflow hidden stays. A class may still collapse. Colour stays.
- **An RTF letter follows the font.** Japanese, Cyrillic, and the other charsets this runtime can name come across when the font says so, even if the document page is Windows-1252. Switching back to an ANSI font is that page again. Windows-1252 is unchanged. A Johab font, and a DOS charset, are still one byte.

Windows installer: Quire-Setup-1.9.21.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.20 — The star under the desk

Released 20 October 2026.

- **A star under the desk can no longer hide the page.** `body > *`, `body *`, `body > * > *`, `:is(body > *)`, `:where(body > *)`, and a nested `& > *` on the desk follow a bare `*`. A star that only excludes a class follows it too. A class under the desk, `html .note`, can still hide that class. `.note-body` can still use `display: none`. `body.note` can still use `display: none`. A named element such as `div` may still use `display: none`. Colour stays.
- **Sin of a half turn is still zero.** `sin(atan2(0, -1))` follows `opacity: 0`, including inside a filter, a scale, and a zoom. `cos(asin(0))` stays. `exp(0)` stays. A turn stays.
- **A clip with no area can no longer hide the desk.** `polygon()` with no area, `xywh()` with a zero width or height, `rect()` with no width or height, and a `path()` that does not enclose an area follow `circle(0)`. A custom property set to that clip follows it. A triangle stays. `circle(40%)` stays. `inset(100px)` stays. A class may still clip.
- **An RTF letter in a page this runtime can name is that letter.** Japanese, simplified Chinese, Korean, traditional Chinese, and Mac Roman come across. Windows-1252 is unchanged. A DOS page this runtime cannot name is still one byte.

Windows installer: Quire-Setup-1.9.20.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.19 — The desk's own name

Released 20 October 2026.

- **A selector that still matches the desk can no longer hide it.** A space inside `:nth-child(2n + 1)` or `:nth-child(n of *)` is still that child. `head + body` and `html>*` follow `body`. `[data-theme]`, `[data-device]`, `[lang=en]`, and `.antialiased` are the desk itself. A class under the desk, `html .note`, keeps `display: none`. A star in front of a class still hides that class. `[contenteditable]` stays.
- **A registered property can no longer hide the desk.** `@property` with `initial-value: 0` or `initial-value: none` follows `opacity: 0` and `display: none` when the desk reads that variable. An explicit `0.5` still wins.
- **Another spelling of zero can no longer hide the desk.** `calc(1 / infinity)`, `min(infinity, 0)`, `exp(-infinity)`, `calc(e - e)`, `asin(0)`, and `calc(asin(0) / 1rad)` follow `opacity: 0`. `exp(0)` stays. `min(infinity, 1)` stays. `sin(90deg)` stays. `acos(0)` stays. `pow(0, 0)` stays. `log(10)` stays.
- **A clip can no longer hide the desk.** `clip-path: inset(100%)`, `inset(50%)`, `circle(0)`, and `circle(0px)` are dropped on the desk. `inset(10%)` stays. `circle(40%)` stays. A class can still clip. A grayscale filter stays. A turn stays. Fixed placement in an add-on stays.

Windows installer: Quire-Setup-1.9.19.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.18 — A zero is still zero

Released 19 October 2026.

- **A power of ten that is still zero can no longer hide the desk.** `0e0`, `0E+2`, `.0e1`, `-0`, and `0e-1` follow `opacity: 0`. `1e-1` stays. `zoom: 0e0` and `scale(0e0)` follow `scale(0)`.
- **A math call that is still zero can no longer hide the desk.** `sign(0)`, `round(0, 1)`, `mod(0, 1)`, `rem(0, 1)`, `hypot(0, 0)`, `pow(0, 1)`, `log(1)`, `sqrt(0)`, `sin(0)`, `sin(180deg)`, `sin(pi)`, `cos(90deg)`, and `tan(0)` follow `opacity: 0`. `sin(90deg)` stays. `pow(0, 0)` stays. `log(10)` stays. `max(0, 1)` stays. A grayscale filter stays. A turn stays.
- **A star in any namespace can no longer hide the desk.** `*|*`, `*|* *|*`, `*|* > *|*`, and `*|*+*|*` follow a bare `*`. A class can still use `display: none`. A star in front of a class can still hide that class.
- **An RTF shape instruction keeps its words.** The words come across once. The words on either side stay apart. A bookmark stays off the page.
- **A paragraph reset in the middle of a line is not a break.** `\pard` after `\par` still starts the next paragraph. The delimiter space is still not a word space.

Windows installer: Quire-Setup-1.9.18.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.17 — The desk stays visible

Released 19 October 2026.

- **A selector that still matches the desk can no longer hide it.** `:nth-child(n)`, `:nth-of-type(n)`, `:first-child` on the page itself, `:not(:not(*))`, and `:not(.note)` follow a bare `*`. A star written beside a class in the same rule follows it too. A class on its own can still use `display: none`. A star in front of a class can still hide that class.
- **Another spelling of zero can no longer hide the desk.** `min(0, 1)`, `max(0, 0)`, `clamp(0, 0, 1)`, `abs(0)`, and `calc(0px / 1px)` follow `opacity: 0`. `brightness(0)` and `contrast(0)` follow `filter: opacity(0)`. A `matrix()` that flattens the page follows `scale(0)`. `min(0.5, 1)` stays. `calc(1px / 2px)` stays. A grayscale filter stays. `rotate()` and `rotateY()` stay.
- **A keyframe can no longer hide the desk.** An animation that reaches `opacity: 0` or `display: none` is not applied to `html`, `body`, or every element. A turn animation stays. A class can still use that animation.
- **A nested rule on the desk can no longer hide it.** `html { & { display: none } }` follows `html { display: none }`. Colour in that rule stays.
- **A Word embedded part keeps the words apart.** `w:contentPart` is a space. The part is not invented.
- **An RTF picture or object group keeps the words apart.** The group is still not body text. The words on either side stay apart.
- **The facing page and print keep the picture layout.** Fit, size, Left, Center, Right, Wrap, Behind, and In front follow the editor. A corner drag still keeps the size you dragged to. The editor frame is unchanged.

Windows installer: Quire-Setup-1.9.17.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.16 — The picture stays where you put it

Released 19 October 2026.

- **Fit, Stretch, Fill, and S M L Full apply again after a corner drag.** Choosing one clears the pixel size that was covering it. A corner drag still keeps the width and the height you dragged to.
- **Left, Center, and Right move the picture.** Center is written on the picture. Left and Right sit on that side of the page. Center leaves Wrap and sits on its own line. A picture you have not aligned stays in the line.
- **Wrap text keeps Fit, Stretch, and Fill.**
- **Behind text and In front of text keep their place.** The paragraph keeps the picture's height, so it does not collapse. Text in that paragraph can sit over or under the picture. The text margin insets it.
- **The text margin applies to Inline as well as Wrap and Break.**
- **Dragging a picture only moves Behind text and In front of text.** An inline picture no longer shifts off its gap and covers the words beside it.

Windows installer: Quire-Setup-1.9.16.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.15 — The size stays a size

Released 17 October 2026.

- **A calculated zero can no longer hide the desk.** `opacity: calc(0)`, `calc(0%)`, and `calc(0 * 1)` follow `opacity: 0`. A custom property set to that zero follows it too. `zoom: 0` follows `scale(0)`. `opacity: calc(0.5)` stays. `zoom: 1.1` stays. A turn stays.
- **A star beside a star can no longer hide the desk.** `* *`, `*+*`, `*>*`, and `*~*` follow a bare `*`. A star in front of a class can still hide that class. A class rule can still use `display: none`.
- **A scientific viewport size can no longer cover the desk.** `1e2vw`, `.5e2dvh`, `+100vh`, and `1e2cqw` follow `100vw`. `1e2px` stays. Colour and a relative offset stay. An add-on may still name a viewport size. Fixed placement in an add-on stays.
- **A narrow no-break space written as a name is a space in the count.** `&nnbsp;` is that space. A written ampersand in front of the name is still the letters.
- **An RTF shape's settings are not body text.** The words in the shape still come across. A contents entry and an index entry stay off the page, the same as a header. The body after them stays.

Windows installer: Quire-Setup-1.9.15.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.14 — The desk stays on the desk

Released 17 October 2026.

- **An add-on can no longer hide the desk with another spelling of zero.** `opacity: .0`, `0.`, `00`, `+0`, and a fallback of zero are dropped on `html`, `body`, `:root`, and `*`. `visibility: collapse` follows `hidden`. `filter: opacity(0)` and `scale(0)` follow `opacity: 0`. A custom property that is `none`, `hidden`, or zero can no longer be the desk's display, visibility, or opacity. `:is(*)`, `:where(*)`, and `:matches(*)` follow a bare `*`. `opacity: 0.5` stays. A class rule can still use `display: none`. Colour stays. A turn that is not a zero scale stays. Fixed placement in an add-on stays.
- **`attr()` can no longer name a picture with `type(<url>)` or `type(<image>)`.** That is the same picture as `attr(title url)`. `attr(data-note)` still reads the text. A string type stays. A quoted mention stays text. Colour stays.
- **A Word drawing, picture, or embedded object keeps the words apart.** The object is not invented. An empty Choice still keeps the only copy of the words. A text box still comes across once.
- **An RTF object placeholder keeps the words apart.** `\objattph` is a space. The object is not invented.

Windows installer: Quire-Setup-1.9.14.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.13 — The words stay apart

Released 16 October 2026.

- **A container-query size can no longer cover the desk.** `cqw`, `cqh`, `cqi`, `cqb`, `cqmin`, and `cqmax` follow the same rule as `dvh`. Colour, a relative offset, a filter, and a turn stay. Fixed placement in an add-on stays. An add-on may still name those sizes.
- **An add-on can no longer hide the desk.** `display` and `pointer-events` no longer take `none` through a variable, and a bare `*` cannot hide every element. `visibility: hidden`, `content-visibility: hidden`, and `opacity: 0` on `html`, `body`, or `:root` are dropped. A class rule can still use `display: none`. Colour stays. Fixed placement in an add-on stays. A refused picture can no longer become `display: none`.
- **A Word comment, page number, date mark, or note mark keeps the words apart.** A comment reference, an annotation reference, a footnote or endnote mark, a page number, and a date part between two runs are a space. The date and the number are not invented. A phonetic guide is not written into the word. The base stays. A tab, a line break, a revision, and a field code stay as they were.
- **An RTF zero-width break stays between the letters.** `\zwbo` is a zero-width space. `\zwnbo` is a word joiner. A zero-width joiner already was.
- **An RTF header field no longer glues the words.** `\chdate`, `\chpgn`, and the other header fields are a space. Quire still does not invent the date or the page number. A footnote mark already was a space.

Windows installer: Quire-Setup-1.9.13.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.12 — The address stays out

Released 16 October 2026.

- **An attribute can no longer name a remote picture.** `attr(title url)` was still fetched, and so was `attr()` inside `image()`, `image-set()`, or `cross-fade()`. The picture is refused. `attr(data-note)` still reads the text of that attribute. A quoted mention of the word stays text. Colour stays. Fixed placement in an add-on stays. A data image stays.
- **An RTF footnote or comment keeps the words apart.** The mark is a space, and the note still comes across. A text-wrapping break already was a line break.
- **A left, right, or first-page header or footer is not body text.** Those follow the same rule as a plain header. A footnote separator line is not body text either.

Windows installer: Quire-Setup-1.9.12.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.11 — The name is still the name

Released 15 October 2026.

- **A backslash at the end of a CSS line no longer fetches a picture or a sheet.** The page already joined that name. `url`, `src`, `image`, and `@import` are still refused, and the same break cannot hide the desk or stay on a picture edit. A data image stays. Colour stays. Fixed placement in an add-on stays. An RTF line broken for transport is unchanged.
- **An RTF text-wrapping break is a line break.** `\lbr` no longer glues the words. A soft line already was a line break.
- **A Word footnote or endnote mark keeps the words apart.** The mark between two runs is a space, the same as a separator. A tab, a line break, a revision, and a field code stay as they were.

Windows installer: Quire-Setup-1.9.11.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.10 — The page and the count

Released 15 October 2026.

- **A named character the page already shows is that character in the count.** 1.9.9 still spelled a hyphen written as `hyphen`, and a letter such as `eacute`. The named set is read once. A written ampersand in front of the name still leaves the letters. A dictionary line uses that same reading.
- **A newer viewport size can no longer cover the desk.** `dvh`, `svh`, `lvh`, and the other dynamic viewport sizes follow the same rule as `vh`. Colour, a relative offset, a filter, and a turn stay. Fixed placement in an add-on stays.
- **A cross-fade can no longer name a remote picture.** A bare address inside `cross-fade()` or `-webkit-cross-fade()` is refused. A cross-fade of two colours stays.
- **An RTF soft break is a line break.** A soft line, a soft page, and a soft column no longer glue the words. A line the file wrapped for transport is not a break on the page. A backslash in front of that line is still a break. A zero-width joiner stays between the letters.
- **An RTF file in another Windows set is those letters.** Windows-1251 and Windows-1250 no longer come across as Latin-1. Windows-1252 is unchanged.

Windows installer: Quire-Setup-1.9.10.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.9 — The break is a break

Released 14 October 2026.

- **A named space that 1.9.8 still spelled out is a space in the count.** Medium, thin, very thin, thick, and non-breaking space no longer glue the words. A dash, a horizontal bar, and a minus written as a name are those marks. A soft hyphen and an em dash already were. Writing the ampersand out in front of the name still leaves the letters.
- **A picture address inside another function cannot fetch a remote file.** `image()` and `image-set()` are read with the parentheses matched, so `type()`, a gradient, or `rgba()` no longer hides the address. A variable inside that call is refused. A data image stays, including one that names its type. Colour stays. Fixed placement in an add-on stays.
- **An RTF table cell or row is a line break.** The words in the next cell no longer run together. A column break already was a line break.
- **An RTF Windows quote or dash is the character.** A hex byte in the Windows-1252 set is the quote, the dash, the bullet, or the euro the page should show, not a control character. A UTF-8 file is read as UTF-8. A character written as one `\u` above the old 16-bit line stays that character. A pair of RTF characters is still one emoji.
- **A Word page break between two runs is a line break.** The words on either side no longer become one word.

Windows installer: Quire-Setup-1.9.9.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.8 — The name is the character

Released 13 October 2026.

- **A named space is a space in the count.** An em space, an en space, a thin space, and the other named spaces no longer glue the words. A tab or a new line written as a name does the same. A soft hyphen stays a soft hyphen. A dash written as a name is that dash. A dictionary line uses that same reading. A numeric space already did. Writing the ampersand out in front of the name still leaves the letters.
- **A data image cannot hide a remote picture beside it.** `image()` and `image-set()` drop an unquoted address even when a data image is quoted in the same call. `src()` and `url()` stay only when the whole address is one data image. A slash pair inside that image stays. A semicolon inside it no longer cuts the page style in half. Colour stays. Fixed placement in an add-on stays.
- **An empty Choice no longer drops the only copy of a text box.** The older copy is skipped only after the Choice has written something. A Choice that already has the words still skips that older copy.
- **An RTF column break or section break is a line break.** A page break already was. The words on either side no longer run together.

Windows installer: Quire-Setup-1.9.8.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.7 — The page stays put

Released 13 October 2026.

- **A table no longer fetches a picture from the old background attribute.** A row, a cell, or the table itself was still a remote image. A data image stays. A link no longer pings a second address when it is clicked.
- **A Word mark between two runs keeps the words apart.** A positional tab, a separator, and a symbol were skipped, so the words on either side became one word. A tab was already a space. A symbol that names a character is that character.
- **An RTF dash, quote, bullet, or space is the character.** Those marks were dropped, and the words on either side became one word. A soft hyphen stays a soft hyphen. A no-break hyphen is a hyphen. A page break is a line break.
- **A link off the writing page does not move the window.** The facing page and print preview follow the same rule as the editor. Another port on this machine is not the desk. Modifier-click still opens the one address outside Quire.

Windows installer: Quire-Setup-1.9.7.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.6 — One copy of the words

Released 12 October 2026.

- **A Word text box is no longer written twice.** The older copy that Word keeps beside the drawing is skipped when the drawing is already there. A box that only has the older copy still comes across. The words after the box stay.
- **A Word hyphen stays a hyphen.** A no-break hyphen is a hyphen, and a soft hyphen stays between the two halves. They no longer become one word.
- **`src()` cannot name a remote picture.** It is treated like `url()`. A data image stays. An unquoted address inside `image()` is refused as well. Fixed placement in an add-on stays.
- **Other numeric spaces count as spaces.** A narrow space, an em space, and an ideographic space no longer glue the words. `&#160;` already did not.
- **Pasted HTML is read the same way an opened HTML file is.** A remote picture, a script, or a cover style does not come in with the paste. Bold, italic, a link, and a picture already on the page stay.

Windows installer: Quire-Setup-1.9.6.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.5 — The same words, still

Released 12 October 2026.

- **An add-on comment can no longer name a remote sheet or picture.** A comment split inside `url` or `@import` is read before the check. `image-set` and `image` with a remote address are refused, on the page and in an add-on. A data image stays. Fixed placement in an add-on stays.
- **A Word text box no longer drops the words after it.** The writing inside the box stays, and so does the writing that follows it. A tab, a line break, a revision, and a field code are unchanged.
- **The Windows shell opens the address the page already checked.** A backslash is not handed across as written. A mail link with a tab, or a unicode line break, is refused. An ordinary https link and an ordinary email stay.
- **A numeric non-breaking space is a space in the count.** `&#160;` no longer glues the two words. `&nbsp;` already did not.
- **Desk search folds letters the same way Find does.** The computer's language no longer makes `I` and `i` disagree. Turkish still types as itself on the page.

Windows installer: Quire-Setup-1.9.5.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.4 — The lock holds the page

Released 11 October 2026.

- **Find waits for the passcode.** Ctrl+F, Ctrl+H, and Find in the Edit menu no longer count or replace words on a locked page. The page menu's Change recipe waits as well. Pin, move, export, print, and delete already did.
- **A desk-wide filter no longer lists a locked title.** A date or a size, with or without words in the box, follows the same rule as Find. Inside the folder you already opened, the title still shows with "Locked page."
- **An RTF group puts the character width back.** A group that changed `\uc` no longer leaves a question mark after the character when the group ends.
- **A Word tab or break written as a pair keeps the space.** A tab or a line break with a closing tag no longer glues the words. A self-closing tab was already kept.
- **The plain text of a page reads a numeric character.** Word count, the page list, and a text export see the character the page shows. A numeric mark such as `&#60;` is that character. A written `&amp;lt;` is still the letters `&lt;`. `&` is still decoded last.
- **A link is still one address.** A mail link with an encoded line break is refused, and a web address cannot hide a different host behind a username. An ordinary https link and an ordinary email stay.
- **The Windows window stays on the desk.** A link cannot navigate the window away. A new window was already refused. Modifier-click and the link chip still open one address outside Quire.

Windows installer: Quire-Setup-1.9.4.exe

Play bundle: unchanged, versionName `1.0.1`, versionCode `2`.

---

# Quire 1.9.3 — The same page, still

Released 10 October 2026.

- **A page style can no longer cover the desk through a variable or an old sticky name.** A position on the page is only static or relative. A bad escape no longer stops the page from opening.
- **An add-on still cannot name a remote sheet.** Escapes are read before the check. Fixed placement in an add-on still works.
- **A dictionary line no longer throws on a lone surrogate.**
- **RTF and Markdown export read the page the same way HTML export does.**
- **A wider phone no longer parks the ruler on the sheet.**

Windows installer: Quire-Setup-1.9.3.exe

---

# Quire 1.9.2 — The page stands upright

Released 9 October 2026.

- **A phone can write without being turned sideways.** The letter page fits the width of an upright screen and scrolls. It is no longer an 8.5 inch sheet clipped to the left edge.
- **Desktop is 1.9.2.** The Windows installer is `Quire-Setup-1.9.2.exe`.
- **The Play build is 1.0.1.** versionName `1.0.1`, versionCode `2`.

Windows installer: Quire-Setup-1.9.2.exe

Play bundle: versionName 1.0.1, versionCode 2

---

# Quire 1.9.1 — The same desk, looked at again

Released 9 October 2026.

- **An imported style still cannot cover the desk.** A comment or a CSS escape no longer brings back fixed, absolute, or sticky placement, or a viewport size. Colour, type, a relative picture offset, and a filter or turn stay. An add-on can still restyle the desk.
- **A picture edit stays a filter or a turn.** An escaped `url()` is dropped with the other remote picture addresses.
- **Word import keeps a tab and a line break inside a paragraph.** The words on either side are not glued together. Struck-out revisions and field codes stay out. An emoji is still kept.
- **An RTF picture no longer throws the reader off.** The bytes after `\bin` are skipped, including a brace. The writing after the picture stays.
- **A folder's size and last edit ignore Trash.** A page or a folder you already removed does not make the folder look larger or newer. Delete, restore, and empty trash are unchanged.
- **A written `<` is not counted as `<`.** The plain text of a page decodes `&` last, the same way export already did.
- **A backup sheet that is not text becomes a blank sheet.** It does not throw, and it does not move the sheets beside it.
- **The eight checks from 1.8.13 stay.** The passcode is still a screen gate. Backups stay plaintext.

Windows installer: build `Quire-Setup-1.9.1.exe` from this source. The copy on disk before this release is still `Quire-Setup-1.9.0.exe`.

Play bundle: unchanged, versionName `1.0`, versionCode `1`.

---

# Quire 1.9.0 — Ready to publish

Released 8 October 2026.

- **Desktop is 1.9.0.** The Windows installer is `Quire-Setup-1.9.0.exe`. It includes the 1.8.13 checks.
- **The Play build is 1.0.** versionName `1.0`, versionCode `1`. The phone shows 1.0. A later desktop number does not change the store listing.
- **Android sync no longer asks Windows for `npx`.** The page was already built. The sync now runs through Node, so `npm run build:android` can finish.
- **The eight checks from 1.8.13 stay.** A stale sheet cannot grow the notebook. Find agrees across a line break. A zip is read from its directory. Word import keeps an emoji. PDF Latin text asks for WinAnsi. An imported style cannot cover the desk. A link is one web address or one email. A passcode check walks the whole digest. The passcode is still a screen gate. Backups stay plaintext.

Windows installer: Quire-Setup-1.9.0.exe

Play bundle: versionName 1.0, versionCode 1

---

# Quire 1.8.13 — The same page, checked twice

Released 8 October 2026.

- **A stale sheet number no longer grows the notebook.** Saving only replaces a sheet that is still there, so a removed sheet cannot come back as a blank extra page.
- **Find agrees across a line break.** The open sheet keeps a break the same way the other sheets do, so the letters on either side are not one word. Overlapping matches are still counted. Replace All still steps through without eating the same letters twice.
- **A zip is read from its directory, not from the first lookalike header.** A `PK` signature inside a file no longer cuts the file short. The 40 MB cap counts decoded bytes, the 80-file cap stays, and a path that climbs out of the archive is still refused.
- **Word import keeps characters past the old 16-bit line.** An emoji stored as a numeric character stays. A null, a surrogate, or a code that is not a character is dropped. Ordinary paragraphs are unchanged.
- **PDF Latin text asks for WinAnsi.** Accented letters are no longer stored as WinAnsi bytes on a font left in Standard encoding. Letters outside that set are still drawn as a picture.
- **An imported style cannot cover the desk.** Fixed, absolute, and sticky placement, and viewport sizes, are dropped from page styles. Colour, type, a relative picture offset, and a filter or turn stay. An add-on can still restyle the desk.
- **A link is one web address or one email.** A second address after a line break is not opened, on the page or by the Windows shell. `javascript:` and `file:` stay refused.
- **A passcode check walks the whole digest.** The passcode is still a screen gate, not encryption. Pages and backups stay plaintext. Wrong guesses still wait, and the wait still grows.

Windows installer: Quire-Setup-1.8.13.exe

---

# Quire 1.8.12 — A phone can reach the desk

Released 8 October 2026.

- **The File menu is on the phone.** Open, backup, transfer, and trash are no longer desktop-only. Keyboard shortcuts stay off the phone menus.
- **Focus is on the page header** on a small screen, not only on a wide one.
- **The keyboard shortens the desk** instead of covering the last lines. Android resizes the window when the keyboard opens.
- **Toolbar buttons are large enough to tap.** Search fields use a text size that does not jump the page when focused.
- **Export and share write into the folder Android is allowed to hand out.** A shared file is no longer stored where the share sheet cannot see it.
- **The Play listing uses the real version.** This build is versionName 1.8.12, versionCode 10812. The broad photo-library permission is not requested. The camera is still offered when you insert a picture, and a phone without a camera can still install.
- **Writing, the passcode, and backups are unchanged.** The passcode is still a screen gate. Backups stay plaintext.

Windows installer: Quire-Setup-1.8.12.exe

---

# Quire 1.8.11 — The same answer everywhere

Released 7 October 2026.

- **Find counts the same hits on every sheet.** Overlapping matches, including a character past the old 16-bit line, are reported on the sheet you are on and on the ones you are not. Replace All still steps through without eating the same letters twice.
- **A sheet number that no longer exists is pulled back.** Opening a page, or removing a sheet, cannot leave Find and the save pointed past the last sheet, and a bad index cannot invent a run of blank sheets.
- **A Windows server that keeps answering with an error is started again,** the same as one that stops answering. Five bad answers, then a flush, then a restart.
- **Android Back waits until the notebook is written,** up to a few seconds, instead of leaving on a short timer.
- **Quill’s word lists give up after 8 seconds,** the same as grammar.
- **An opened zip cannot expand without a limit.** Inflation stops at the same 40 MB cap as the file itself.
- **Imported picture styles can only be a filter or a turn.** A saved page cannot use that style to cover the desk. Odd picture addresses (`file:`, `blob:`, and the like) are dropped.
- **PDF keeps letters it used to turn into a question mark,** by drawing that line. Latin text stays real text.
- **Word export keeps pictures** that already live on the page. The old Word HTML export is cleaned the same way as the web page export.
- **The passcode is still a screen gate, not encryption.** Pages and backups stay plaintext.

Windows installer: Quire-Setup-1.8.11.exe

---

# Quire 1.8.10 — The window opens

Released 7 October 2026.

- **The desk opens again.** The 1.8.9 window policy blocked the page's own startup script, so the installed app stayed blank. That script is allowed. Remote scripts still are not.

Windows installer: Quire-Setup-1.8.10.exe

---

# Quire 1.8.9 — Keep the last keystroke

Released 7 October 2026.

- **A stalled Windows server no longer reloads the desk under your hands.** Health checks ignore sleep and a single bad answer. Five misses are required before the local server is restarted, and the page is written first. A server that exits on its own does the same. Only an HTTP 200 counts as “up.” A busy port is named only when something is already listening.
- **Delete, duplicate, a new folder, and restore write the page on screen first.** The last half-second is not left in the debounce. A sheet split still cancels the page timer, not the title.
- **A failed desk read is not saved as a new Welcome.** Quire stays on the “could not be read” screen instead of writing a seed over the notebook already on this device.
- **The passcode is still a screen gate, not encryption.** Pages and backups stay plaintext. A wrong guess now waits, and the wait grows. The overlay says the file is not encrypted.
- **Imported HTML is tighter.** Scriptable SVG data URLs, `srcset`, form actions, `javascript:` image links, highlight colors, and `url()` / `expression()` in styles and add-on CSS are dropped. The Windows window has a content policy. Android no longer allows mixed content, and Android backup of the app data is off.
- **Paste from the Edit menu is text.** A copied `<img onerror>` is not parsed as markup.
- **Open keeps Word paragraphs and skips RTF font tables.** A `.txt` is text even if it mentions `<html`. A zip over 40 MB, or a path that climbs out of the archive, is refused. A backup with a null page is skipped. Restoring a desk does not roll a newer Desk revision back unless the backup is newer.
- **An empty table, rule, or checklist is not a blank sheet.** The second copy of “Name copy” is “Name copy 2.” Move to shows the folder path. New page and new folder wait if that folder is locked. Find reports overlapping matches. Hardware Back on Android can leave the app, and it writes first.
- **Grammar and Quill give up after 8 seconds** instead of waiting forever.
- **Pictures over 25 MB are refused. A GIF over 8 MB is refused** instead of frozen.
- **PDF can still turn letters outside Latin-1 into a question mark. Word export still leaves pictures out.** Those were left as they are.

Windows installer: Quire-Setup-1.8.9.exe

---

# Quire 1.8.8 — Safer opens

Released 25 September 2026.

- **Opening a link from the page only goes to a normal web address.** A click opens http or https. Other kinds of links are refused the same way the in-app open already was
- **Links you paste or autolink in the editor stay web or email** — not ftp, tel, and the like
- **If the local Windows server stops answering with an error, Quire counts that toward starting it again,** the same as a timeout
- **Windows builds: the test suite actually runs the script tests now.** A couple of symlink checks skip when Windows blocks symlinks
- **Lint no longer scans the packed release folder**
- **Small cleanups** in ambient sound and auth parsing

Windows installer: Quire-Setup-1.8.8.exe

---

# Quire 1.8.7 — The whole page

Released 24 September 2026.

- **A full sheet turns when the desk is scaled.** The cut now uses the same size you see, so a fitted window no longer scrolls inside the page, and zooming in does not turn too early
- **Export, print, and backup keep the last keystrokes.** File, the page menu, and Desk write the page that is on screen, not the one from half a second ago. Ctrl+S already did
- **Restore desk replaces the open page.** The page you were typing is not written back over the restored copy
- **Remove on a blank sheet checks again.** Words you just typed are not flushed and then deleted
- **Closing waits, and asks if the save did not finish.** A failed save, or one that is still going after a longer wait, offers to keep Quire open
- **GIFs stay in motion,** including ones larger than a small photo. A GIF over 8 MB is refused instead of frozen. A transparent WebP or PNG keeps its clear background
- **Find and Replace cover every sheet** of the page. What you type is text, so `<` and `&` are not turned into markup
- **Mute stops the level meter.** Ctrl+M and the speaker quiet the room and the meter. Turning the room sound off still does both
- **“I mean …” is not a definition.** Define, “what is,” and “look up” still are
- **A line break inside a paragraph** no longer shifts a grammar fix onto the wrong words
- **Word export keeps tables** as tables. Pictures are still left out
- **PDF keeps an empty sheet,** and a filter or rotation on a GIF shows on that page. Letters outside Latin-1 can still appear as a question mark
- **Definitions read as words.** Ampersands and quotes are not left as dictionary codes
- **Links must be a web address or an email.** A `javascript:` link is refused. An imported page does not fetch a remote image hidden in a style
- **If the Windows server stops answering after startup, Quire starts it again.** A crash before the first page is ready is tried once more. The passcode is still a screen gate. It does not encrypt the page

Windows installer: Quire-Setup-1.8.7.exe

---

# Quire 1.8.6 — The last line stays

Released 24 September 2026.

- **Leaving a sheet keeps the last keystrokes.** Adding a sheet, turning the page, or opening another page within the half-second save no longer drops what you just typed. A title change is kept the same way
- **Quill’s greeting no longer covers the desk.** It sits in the corner. Escape, a click on the page, or Close dismisses it. Never show again still keeps it away next time
- **A failed save says so.** The header stays on “Could not save” instead of “Saving” when the write does not land
- **Large GIFs are reduced** the way large photos already are, so a few animations cannot fill the desk. A small GIF is left as it is
- **Saves reuse one database connection** instead of opening a new one on every keystroke pause
- **A new desk’s Welcome** is dated the day you first open Quire, not 12 September 2026
- **Open needs a folder.** If the desk has none, Quire makes one and puts the file there. It does not say the file opened when the page was never created
- **Grammar sends the sentence you are in**, not the whole sheet. A fix that cannot find its place is not pasted at the cursor. Quill does not send a selection out unless you ask it to polish. A definition tries another dictionary if the first one is down
- **Suggestions are typed as text.** A grammar or Quill line that contains `<` or `&` is not treated as markup
- **RTF keeps emoji and other characters above the old 16-bit line**
- **PDF starts a new page for each sheet** and uses the page size from Desk. Letters outside the Latin-1 set can still appear as a question mark
- **Word lists keep their bullets.** Pictures are still left out of the Word file
- **If the Windows server stops after startup, Quire starts it again.** The message names a busy port only when the port is actually busy. Closing while the first page is still loading waits for the save. Desk settings are written to the side, then moved into place, so a crash mid-write does not leave a half file
- **Turning the room sound off stops the level meter** as well as the audio
- **The passcode is still a screen gate.** It does not encrypt the page. A locked page is still plain text on this device

Windows installer: Quire-Setup-1.8.6.exe

---

# Quire 1.8.5 — The next sheet


Released 23 September 2026.

- **A full sheet turns the page.** A long paragraph now continues on the next sheet. A picture taller than the page stays where it is, instead of trapping the rest of the writing
- **A split stays split.** The page that overflowed is not pasted back onto sheet 1, so the same words are not written twice
- **Quitting waits for the save.** If a save is already running, Quire waits for it and tries once more if the write fails. The window is not told the save finished until the notebook is actually stored. The header says “Saved on this device” only after that write, and stays on “Saving” if it does not
- **Word files open as words.** Ampersands and quotes are no longer left as `&` and `"`. A Word file that stores its size at the end of each part is read through, including the document
- **An older Desk file** cannot replace a newer theme, dictionary, or word aim when both copies are already on this computer
- **Startup does not wait forever.** If the local server never answers, or port 4173 is already taken, Quire stops and says so
- **PDF** places pictures where they sat in the writing, and sizes them to the page instead of shrinking them twice. Letters outside the normal Latin set can still appear as a question mark
- **A personal theme** is the desk you see when Quire opens, not a flash of Dark first
- **Export** separates sheets with a new line, from the File menu and the page menu, so the last word of one sheet does not stick to the first word of the next
- **Remove from the spelling book** no longer claims success when Windows cannot drop the word yet. The passcode is still a screen gate: it hides a page on this device, and it does not encrypt the notebook or a backup

Windows installer: Quire-Setup-1.8.5.exe

---

# Quire 1.8.4 — Keep the ink

Released 23 September 2026.

- **Closing the window keeps the last keystrokes.** A save that was still waiting is written before Quire quits. Closing again while that write is running waits, instead of throwing the window away
- **Ctrl+S saves the page** on this device. It no longer exports a Word file. Export stays in the File menu. Cancelling a save dialog is not an error
- **Replace All stops.** Replacing “cat” with “catalog” no longer runs forever
- **Sheets keep their recipe and ribbons** when a page overflows or a blank sheet is removed
- **Trash restore is more careful.** Restoring a folder does not bring back pages you trashed on their own, and it does not restart the 30 days for things already in Trash
- **Welcome is left alone.** Upgrading no longer replaces writing on “Welcome to Quire”
- **The daily word count** starts over when you change sheets, so a long sheet is not counted twice
- **Find** can see a word that is half bold or half highlighted
- **Grammar fixes** land on the right words after the first paragraph
- **A locked page** must be unlocked before Delete or Move, same as export and print. The passcode is still a screen gate, not a lock on the file
- **Your dictionary** is loaded again when Quire opens on Windows, and Quill’s polish skips those words. Removing a word takes it out of the spelling book
- **An older Desk file** cannot roll back a newer theme, dictionary, or word aim
- **One Quire window.** A second launch focuses the window you already have, instead of two copies writing one desk
- **Print** opens on the sheet you are writing and prints that sheet unless you turn off “This sheet only”
- **Open** keeps characters from Word and RTF instead of showing the raw codes or doubling them
- **Word export** no longer prints the same paragraph twice, and it keeps bold and italic
- **PDF** no longer swaps later pictures for earlier ones, and letters outside plain English no longer break the file
- **Quill** no longer treats “meant” as “define” or “prefix” as “fix”. Polish and definitions say when a sentence leaves the device. The notebook itself does not

Windows installer: Quire-Setup-1.8.4.exe

---

# Quire 1.8.3 — Trash from Desk


Released 22 September 2026.

- **Desk → Trash** — the Trash button in Desk settings opens the same list as File → Trash, including archived pages and folders

Windows installer: Quire-Setup-1.8.3.exe

---

# Quire 1.8.2 — The room stays quiet


Released 22 September 2026.

- **Mute stays muted** — creating a folder or a page, or renaming either one, no longer turns the room sound back on if you had muted it. Mute (or Ctrl+M) still toggles it. Dragging the volume slider still brings it back.

Windows installer: Quire-Setup-1.8.2.exe

---

# Quire 1.8.1 — Bookmarks, notes, and a page menu

Released 18 September 2026.

- **Color bookmarks** — select a letter, word, or passage and mark it Wine, Moss, Gilt, Sky, or Umber. The toolbar lists them so you can jump back
- **Notes** — add a note to a selection. A number in brackets sits beside it; hover the number to read the note. The Notes tab in the toolbar holds every note on the sheet
- **Right-click menu** — cut, copy, paste, select all, look up a word, narrate, add to dictionary, highlight, bookmark, add a note, and Quill (Shorter, Clearer, Fleshed out, Polish, Better word)

Windows installer: Quire-Setup-1.8.1.exe

---

# Quire 1.8.0 — Desk extras

Released 16 September 2026.

Writing tools that stay on this device.

- **Ink-saver print** — optional black type on white paper, and grayscale pictures, in print preview
- **Headers and page numbers** on printed sheets
- **PDF keeps pictures** — File → Export as PDF embeds the images on the page
- **Tables** — insert a 3×3 table from the toolbar; add or remove rows and columns
- **Transfer to another device** — save a zip on this computer, restore it on the phone or PC. Nothing goes through the internet
- **Journal date** — a new Journal page starts with today's date
- **Lock** — a passcode on a page or a folder. The passcode never leaves this device, and Quire cannot recover it
- **Two-page spread** — the next sheet sits beside the one you are writing
- **Add to dictionary** — selected words stay on this device and skip grammar marks
- **Quill** — can flesh out a short line in your voice; Shorter, Clearer, Fleshed out, Polish, Better word
- **Quill's face** — a white quill on black, with googly eyes
- **Rain** — blue-grey paper over a black desk; opening storm with rain, splashes, and distant thunder

Windows installer: Quire-Setup-1.8.0.exe

---

# Quire 1.7.0 — Android

Released 16 September 2026.

Quire is now a phone app as well as a Windows notebook.

- Android app via Capacitor (same desk, pages still on this device)
- Camera and gallery when you insert a picture
- Export and backup use the Android share sheet
- Phone layout: folders and pages first, letter sheet second, rulers tucked away
- System back key leaves a page, then the app

See ANDROID.md. Windows installer: Quire-Setup-1.7.0.exe

---

# Quire 1.6.3

Released 13 September 2026.

A cozy trust fix: your desk remembers how you left it.

- **Theme & Desk settings** survive a full quit and reopen (Navy, Dark, Light, Leather, ambient, opening scenes, and the rest)
- **Opening ritual** follows the theme you saved — not a Dark flash-default
- Pages and notebooks still live in the same local desk store

---

# Quire 1.6.2 — Cozy openings

Released 13 September 2026.

Each built-in theme now opens with its own quiet scene and room sound, then fades onto the desk.

- **Navy** — a wave wash; ocean and distant birds
- **Dark** — a moon and a paper owl; night insects and a soft hoot
- **Light** — plate, bagel, and coffee handed to the desk; café room tone
- **Leather** — the familiar falling leaves and wind chimes
- Esc skips the opening; reduced motion shows a still card
- Room sound follows the theme and crossfades when you change it

---

# Quire 1.6.1

Released 13 September 2026.

A small trust fix for the Desk ritual release.

- **About / shelf version** — Quire now shows the real app version (1.6.x) instead of a stuck 1.5.1 label

Installer: Quire-Setup-1.6.1.exe

---

# Quire 1.6.0 — Desk ritual

Released 13 September 2026.

A quieter writing posture for the desk you already know.

- **Page recipes** — New page asks what you are writing (Letter, Journal, Poem, List, Freewrite). Change recipe later; your words stay.
- **Ink only** — Just paper and typing. Hides borders, rulers, and picture chrome. Stacks with Focus; Esc still leaves Focus only.
- **Page map** — Jump to Heading 1–3 on this sheet (“On this page”).
- **Ribbon bookmarks** — Place a ribbon at the caret, jump back, or untie it.
- **Read back** — Local text-to-speech from caret or selection. Voice and pace live in Desk settings.

No cloud writing, no collab chrome. Quill stays a local helper.

Installer: Quire-Setup-1.6.0.exe

---

# Quire 1.5.1

Released 13 September 2026.

A calm follow-up to the Cozy Update.

- Chime dial sits in the bottom bar, centered between word count and zoom
- Desk → Wind chimes off hides the dial as well as the sound
- The falling-leaf opening fades into the desk instead of cutting
- Quill greets from a center popup: Close, or Never show again
- Quill’s chat stays closed until you open the feather in the toolbar
- Starter desk keeps only Welcome to Quire; sample pages are gone

Installer: Quire-Setup-1.5.1.exe

---

# Quire 1.5.0 — Cozy Update

Released 13 September 2026.

A quieter desk you can trust. Pages still live only on this computer.

- Opens on the last folder, page, sheet, cursor, and zoom
- Deleted pages and folders wait in Trash for 30 days
- File → Backup desk / Restore desk (local zip)
- Ctrl+F find, Ctrl+H replace
- Gentler Focus, typewriter scroll, daily word aim
- Soft looping wind chimes with a corner volume dial and Ctrl+M mute
- Falling leaves on launch, timed with the chimes
- Quill, a writing aide in the toolbar
- Welcome page rewritten as a field guide

Installer: Quire-Setup-1.5.0.exe

---

# Quire 1.4.0

Released 13 September 2026.

## Print
- File → Print preview (Ctrl+P) shows the page as a letter sheet before it hits the printer
- Walk pages with arrows, switch Portrait or Landscape for this print job
- Print sends only the page, not the whole Quire window
- Esc closes the preview

---

# Quire 1.3.0

Released 12 September 2026.

## Folders
- Folders can stack inside other folders, as deep as you want
- A folder can hold more folders and pages
- New folder, New folder inside, Move into, and Delete (including nested contents)
- The left shelf is a tree you can expand and collapse

## Color coding
- Color any folder from its ⋯ menu (swatches or a custom picker)
- Color any page from the small circle on the page list

## Search and filters
- Search bar looks through folder names and page text
- Filter by date created, last updated, and file size (small / medium / large)
- Sort by last updated, date created, file size, or name

## Pictures
- Word-style layout: Inline with text, Wrap text, Break text, Behind text, In front of text
- Text margin slider around pictures
- GIFs stay moving when you edit them (crop is skipped so frames are not frozen)
- Watermark is real overlay text, not just a faded picture
- Hover a picture to show corner handles and drag to resize
- Click a picture to select it and show Picture tools
- Drag the picture (not a corner) to move it on the page
- Pictures no longer sit behind a divider line from the writing

## Fixes
- New blank pages stay a full 8.5 × 11 in letter instead of shrinking
- Behind / In front of text pictures stay in that layer while you drag them
- File size in search is counted once, not twice

---

# Quire 1.2.0

- Real letter page (8.5 × 11 in portrait, landscape from Page)
- Inch rulers with cursor readout, on by default
- File / Edit / View / Help menus
- Open and export .DOCX, .DOC, .PDF, .TXT, .RTF
- Look up word: pronunciation, type, definition, example, synonyms, antonyms
