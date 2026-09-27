# Subt Export

Расширение для Chromium-браузеров, которое сохраняет расшифровку видео или доступную дорожку субтитров в текстовый файл `subt.txt`. Реплики разделяются пустой строкой.

## Возможности

- Экспорт расшифровки YouTube из панели видео, включая сегменты, подгружаемые при прокрутке.
- Запасная загрузка дорожек субтитров YouTube в форматах JSON3, SRV, TTML и WebVTT.
- Экспорт доступных дорожек субтитров HTML-видео на других сайтах.
- Сохранение результата в `subt.txt` одной кнопкой.
- Интерфейс на русском языке в стиле ClipCraft.

## Установка

1. Скачайте ZIP-архив репозитория с GitHub и распакуйте его либо клонируйте репозиторий.
2. Откройте страницу расширений Chromium-браузера: `chrome://extensions/` в Chrome, Edge и большинстве Chromium-браузеров.
3. Включите режим разработчика.
4. Нажмите «Загрузить распакованное расширение» и выберите папку `subt-exporter`, содержащую `manifest.json`.
5. Откройте страницу с видео и нажмите значок Subt Export.

## Использование

Нажмите «Скачать subt.txt». На YouTube расширение сначала читает открытую расшифровку, затем пробует загрузить дорожку субтитров напрямую. На других сайтах оно использует дорожку, доступную встроенному HTML-видеоплееру. Если YouTube не открыл расшифровку автоматически, откройте её из меню видео и повторите экспорт.

Для обновления после установки из папки нажмите кнопку перезагрузки расширения на странице `chrome://extensions/` и обновите вкладку с видео.

## Доступ и конфиденциальность

Разрешение `activeTab` даёт доступ только к текущей вкладке после нажатия на расширение. Разрешение `scripting` используется для чтения расшифровки и дорожек субтитров на этой вкладке. Текст обрабатывается локально в браузере и сохраняется на устройство; расширение не отправляет его на сторонние серверы.

Расширение может экспортировать только расшифровки и дорожки, доступные текущему браузерному сеансу. Видео без доступных субтитров, ограниченные дорожки и изменения интерфейса видеосайтов могут помешать экспорту.

## Языки

Интерфейс расширения доступен на русском языке.

---

# Subt Export

A Chromium browser extension that saves a video's transcript or an available subtitle track to `subt.txt`. Each cue is separated by a blank line.

## Features

- Export the YouTube transcript panel, including segments loaded while scrolling.
- Fall back to YouTube subtitle tracks in JSON3, SRV, TTML, and WebVTT formats.
- Export available subtitle tracks from HTML video players on other websites.
- Save the result as `subt.txt` with one click.
- Russian-language interface styled after ClipCraft.

## Installation

1. Download and extract the repository ZIP from GitHub, or clone the repository.
2. Open your Chromium browser's extensions page. Use `chrome://extensions/` in Chrome, Edge, and most Chromium-based browsers.
3. Enable Developer mode.
4. Select **Load unpacked** and choose the `subt-exporter` folder containing `manifest.json`.
5. Open a video page and select the Subt Export icon.

## Usage

Select **Download subt.txt**. On YouTube, the extension reads the open transcript first and then tries to fetch a subtitle track directly. On other websites, it uses a track exposed by the embedded HTML video player. If YouTube did not open the transcript automatically, open it from the video menu and try the export again.

To update an unpacked installation, reload the extension on `chrome://extensions/` and refresh the video tab.

## Permissions and privacy

The `activeTab` permission grants access only to the current tab after the extension is selected. The `scripting` permission is used to read the transcript and subtitle tracks on that tab. Text is processed locally in the browser and saved to the device; the extension does not send it to third-party servers.

The extension can export only transcripts and tracks available to the current browser session. Videos without accessible subtitles, restricted tracks, and changes to a video's website interface may prevent export.

## Languages

The extension interface is available in Russian.