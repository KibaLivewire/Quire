export const WELCOME_VERSION = 3;

export const WELCOME_HTML = `
<p>Quire is a notebook that lives on this computer. Nothing is uploaded. This page is a field guide — every mark below is a real example of a tool you can use.</p>

<h2>The desk</h2>
<p>Folders sit on the left. Pages sit beside them. The letter sheet in the middle is <strong>8.5 × 11 inches</strong> — portrait unless you switch it. A thin ruler tracks the cursor in inches. Hide the ruler from <em>View</em> if you want a quieter page.</p>
<p>Quire remembers the last folder, page, sheet, cursor, and zoom, so you return to the same sentence.</p>

<h2>Ink</h2>
<p>Write with <strong>bold</strong>, <em>italic</em>, <u>underline</u>, or a <mark data-color="#f3e2a0" style="background-color: #f3e2a0; color: #1c1917">highlight that keeps the words readable</mark>. Change typeface and size from the bar. Align a paragraph, indent it, or set line spacing there too.</p>
<blockquote><p>A block quote looks like this — useful for a line you want to sit apart.</p></blockquote>
<ul>
<li><p>A list, when the thought wants steps</p></li>
<li><p>Numbered lists are one click away</p></li>
</ul>

<h2>Pictures</h2>
<p>Drop a JPEG, PNG, GIF, or WebP onto the page, or use Insert image. GIFs stay in motion. Drag a picture to place it. Corner handles resize it. Wrap text around it, or set a watermark so writing can sit over it.</p>
<img src="/welcome-desk.jpg" alt="An open journal and a quill in an inkpot on a cedar table">

<h2>Desk ritual</h2>
<p>When you start a page, Quire asks <em>What are you writing?</em> — Letter, Journal, Poem, List, or Freewrite. Freewrite is the loose scrap; Letter is a proper sheet. Change recipe anytime from the page menu. Dates stay yours to stamp.</p>
<p><strong>Ink only</strong> leaves just paper and typing (borders and rulers tuck away). It stacks with Focus; Esc still only leaves Focus. The <strong>Page map</strong> lists headings on this sheet. <strong>Ribbons</strong> pin a spot to return to. <strong>Read back</strong> speaks the page aloud with a voice on this computer.</p>

<h2>Focus, find, and print</h2>
<p><strong>Focus</strong> (the expand button, or View) hides the shelf so only the page remains. Typewriter scroll keeps the line you are on near the middle. A daily word aim can sit in the corner — a count, not a streak.</p>
<p><strong>Ctrl+F</strong> finds on this page. <strong>Ctrl+H</strong> replaces. <strong>Ctrl+P</strong> opens print preview as a letter sheet, then prints only that sheet.</p>

<h2>Keeping work safe</h2>
<p>Delete sends a page or folder to <em>File → Trash</em> for 30 days. <em>File → Backup desk</em> writes every notebook to a zip on this computer. Restore puts that desk back.</p>
<p>Export as .DOCX, .DOC, .RTF, .TXT, or .PDF from File. Open those same kinds of files from File → Open.</p>

<h2>Quill</h2>
<p>The feather in the toolbar is <strong>Quill</strong>, a local helper on this desk. Highlight a sentence and ask him to shorten it, polish it, or fetch a better word. He greets you when Quire opens. Turn him off in Desk if you want the page alone.</p>

<h2>Sound and first light</h2>
<p>Wind chimes loop softly after falling leaves carry you onto the desk. Both are on by default. The dial in the bottom corner sets the volume; the speaker mutes. <strong>Ctrl+M</strong> mutes too. Desk settings can silence the chimes or skip the leaves.</p>

<h2>A page, not a feed</h2>
<p>Themes live in Desk — dark, light, navy, leather, or a palette you save. Borders follow the paper. Add-ons can bring extra themes. Pages never leave this device unless you export or back them up yourself.</p>
<p>When a sheet fills, the next one appears. The rest is ink.</p>
`.trim();
