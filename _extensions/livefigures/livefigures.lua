-- quarto-livefigures: render .excalidraw figure sources inside quarto render.
-- Detects Image elements targeting .excalidraw files, renders them via the
-- bundled Node renderer into a content-addressed cache, and rewrites the
-- image target so Quarto's native figure pipeline handles everything else.
-- See docs/ARCHITECTURE.md and docs/adr/ for the decisions behind this.

local VERSION = "0.1.0"

local path = pandoc.path
local ext_dir = path.directory(PANDOC_SCRIPT_FILE)
local renderer = path.join({ ext_dir, "renderer.mjs" })

local opts = { theme = nil, background = "transparent" }
local node_checked = false
local css_added = false

local function fail(msg)
  -- error() alone is caught by quarto's filter machinery and the render
  -- continues; exiting pandoc is the only reliable hard failure (ADR 0006).
  io.stderr:write("ERROR (livefigures): " .. msg .. "\n")
  os.exit(1)
end

local function check_node()
  if node_checked then return end
  local proc = io.popen("node --version 2>&1")
  local out = proc and proc:read("*a") or ""
  local ok = proc and proc:close()
  local major = tonumber(out:match("^v(%d+)"))
  if not ok or not major then
    fail("Node.js was not found on PATH. quarto-livefigures requires Node >= 18 " ..
      "to render .excalidraw figures. Install it from https://nodejs.org/")
  end
  if major < 18 then
    fail("Node " .. out:gsub("%s+$", "") .. " is too old; quarto-livefigures requires Node >= 18.")
  end
  node_checked = true
end

local function cache_dir()
  local base = quarto.project.directory
  if not base then
    base = path.directory(quarto.doc.input_file)
  end
  local dir = path.join({ base, "_livefigures" })
  pandoc.system.make_directory(dir, true)
  return dir
end

local function read_file(p)
  local f = io.open(p, "rb")
  if not f then return nil end
  local content = f:read("*a")
  f:close()
  return content
end

local function render(img)
  local input_dir = path.directory(quarto.doc.input_file)
  local src = img.src
  if not path.is_absolute(src) then
    src = path.join({ input_dir, src })
  end

  local scene = read_file(src)
  if not scene then
    fail(img.src .. " does not exist (referenced from " .. quarto.doc.input_file .. ")")
  end

  local format = quarto.doc.is_format("latex") and "png" or "svg"
  local theme = img.attributes["theme"] or opts.theme
    or (quarto.doc.is_format("html") and "auto" or "light")
  local background = img.attributes["background"] or opts.background
  if theme ~= "light" and theme ~= "dark" and theme ~= "auto" then
    fail('invalid theme "' .. theme .. '" on ' .. img.src .. ' (use light, dark, or auto)')
  end
  if background ~= "transparent" and background ~= "scene" then
    fail('invalid background "' .. background .. '" on ' .. img.src .. ' (use transparent or scene)')
  end
  -- auto = render light once; dark pages restyle via CSS (ADR 0005)
  local render_theme = theme == "dark" and "dark" or "light"

  local key = pandoc.utils.sha1(scene .. format .. render_theme .. background .. VERSION)
  local stem = path.split_extension(path.filename(src))
  local out = path.join({ cache_dir(), stem .. "-" .. key:sub(1, 8) .. "." .. format })

  if not read_file(out) then
    check_node()
    local cmd = string.format(
      'node "%s" --input "%s" --output "%s" --format %s --theme %s --background %s',
      renderer, src, out, format, render_theme, background)
    if not os.execute(cmd) then
      fail("rendering failed for " .. img.src .. " (see error above)")
    end
  end

  img.src = path.make_relative(out, input_dir)
  img.attributes["theme"] = nil
  img.attributes["background"] = nil
  img.classes:insert("livefigure")
  if theme == "auto" then
    img.classes:insert("livefigure-auto")
  end

  if quarto.doc.is_format("html") and not css_added then
    quarto.doc.add_html_dependency({
      name = "livefigures",
      version = VERSION,
      stylesheets = { "livefigures.css" },
    })
    css_added = true
  end
  return img
end

return {
  {
    Meta = function(meta)
      local lf = meta.livefigures
      if lf then
        if lf.theme then opts.theme = pandoc.utils.stringify(lf.theme) end
        if lf.background then opts.background = pandoc.utils.stringify(lf.background) end
      end
    end,
  },
  {
    Image = function(img)
      if img.src:match("%.excalidraw$") then
        return render(img)
      end
    end,
  },
}
