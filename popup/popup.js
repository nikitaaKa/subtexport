const exportButton = document.getElementById('exportButton');
const status = document.getElementById('status');
const statusText = document.getElementById('statusText');

exportButton.addEventListener('click', async () => {
  exportButton.disabled = true;
  setStatus('Ищу субтитры…');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('Не удалось определить активную вкладку.');
    }

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: async () => {
        const cleanCueText = (text) => text
          .replace(/<\/?(?:i|b|u|c(?:\.[\w-]+)?|v(?:\s+[^>]*)?|lang(?:\s+[^>]*)?)>/gi, '')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;/g, "'")
          .replace(/[\t ]+/g, ' ')
          .trim();

        const makeTranscript = (lines) => lines
          .map(cleanCueText)
          .filter(Boolean)
          .join('\n\n');

        const parseTextCues = (text) => {
          const lines = text.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n');
          const cues = [];
          let cueLines = [];
          let inCue = false;

          const saveCue = () => {
            if (cueLines.length) cues.push(cueLines.join(' '));
            cueLines = [];
          };

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              saveCue();
              inCue = false;
            } else if (/^(WEBVTT|NOTE|STYLE|REGION)(?:\s|$)/i.test(trimmed)) {
              saveCue();
              inCue = false;
            } else if (/^(?:\d{2}:\d{2}:\d{2}[.,]\d{3}|\d{2}:\d{2}[.,]\d{3})\s+-->\s+/.test(trimmed)) {
              saveCue();
              inCue = true;
            } else if (/^\d+$/.test(trimmed) && !inCue) {
              saveCue();
            } else if (inCue) {
              cueLines.push(trimmed);
            }
          }

          saveCue();
          return makeTranscript(cues);
        };

        const parseSubtitleBody = (body) => {
          try {
            const data = JSON.parse(body);
            if (Array.isArray(data.events)) {
              const transcript = makeTranscript(data.events.map((event) =>
                (event.segs || []).map((segment) => segment.utf8 || '').join('')
              ));
              if (transcript) return transcript;
            }
          } catch {
          }

          if (/<(?:text|p)\b/i.test(body)) {
            const xml = new DOMParser().parseFromString(body, 'text/xml');
            if (!xml.querySelector('parsererror')) {
              const textNodes = [...xml.getElementsByTagName('text')];
              const cueNodes = textNodes.length ? textNodes : [...xml.getElementsByTagName('p')];
              const transcript = makeTranscript(cueNodes.map((node) => node.textContent || ''));
              if (transcript) return transcript;
            }
          }

          return parseTextCues(body);
        };

        const parsePlayerResponse = (raw) => {
          if (!raw) return null;
          if (typeof raw === 'object') return raw;
          try { return JSON.parse(raw); } catch { return null; }
        };

        const player = document.getElementById('movie_player');
        const playerResponse = parsePlayerResponse(
          player?.getPlayerResponse?.()
        ) || parsePlayerResponse(globalThis.ytInitialPlayerResponse)
          || parsePlayerResponse(globalThis.ytplayer?.config?.args?.player_response)
          || parsePlayerResponse(globalThis.ytcfg?.get?.('PLAYER_VARS')?.player_response);

        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        const captionUrls = captionTracks
          .filter((track) => track.baseUrl)
          .sort((left, right) => Number(left.kind === 'asr') - Number(right.kind === 'asr'))
          .map((track) => track.baseUrl);

        for (const resource of performance.getEntriesByType('resource')) {
          try {
            const resourceUrl = new URL(resource.name);
            if (resourceUrl.pathname.endsWith('/api/timedtext') && resourceUrl.searchParams.has('v')) {
              captionUrls.push(resourceUrl.toString());
            }
          } catch {
          }
        }

        const isYouTube = /(^|\.)youtube\.com$/i.test(location.hostname);
        const readTranscriptPanel = () => {
          const segments = [...document.querySelectorAll('transcript-segment-view-model')];
          return segments
            .map((segment) => ({
              time: segment.querySelector('.segment-timestamp, [class*="segment-timestamp"]')?.textContent?.trim() || '',
              text: segment.querySelector(':scope > span, span')?.textContent?.trim() || ''
            }))
            .filter((segment) => segment.text);
        };

        const findTranscriptAction = () => [...document.querySelectorAll(
          'ytd-menu-service-item-renderer, [role="menuitem"], tp-yt-paper-item, button'
        )].find((element) => {
          const label = `${element.innerText || ''} ${element.getAttribute('aria-label') || ''}`;
          return /show transcript|transcript|расшифровк|показать текст/i.test(label);
        });

        const getTranscriptFromPage = async () => {
          if (!readTranscriptPanel().length) {
            const action = findTranscriptAction();
            if (action) {
              action.click();
            } else {
              const moreButton = [...document.querySelectorAll('[aria-label], [title]')].find((element) =>
                /more actions|ещё действия|дополнительные действия/i.test(
                  `${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''}`
                )
              );
              moreButton?.click();
              if (moreButton) {
                await new Promise((resolve) => setTimeout(resolve, 250));
                findTranscriptAction()?.click();
              }
            }
          }

          let segments = readTranscriptPanel();
          for (let attempt = 0; !segments.length && attempt < 25; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            segments = readTranscriptPanel();
          }
          if (!segments.length) return '';

          const panel = document.querySelector('ytd-transcript-renderer, ytd-engagement-panel-section-list-renderer');
          const segmentElement = document.querySelector('transcript-segment-view-model');
          let scroller = null;
          for (let parent = segmentElement?.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
            const overflowY = getComputedStyle(parent).overflowY;
            if (parent.scrollHeight > parent.clientHeight + 20 && /auto|scroll|overlay/.test(overflowY)) {
              scroller = parent;
              break;
            }
          }
          scroller ||= panel;
          if (scroller) {
            scroller.scrollTop = 0;
            await new Promise((resolve) => setTimeout(resolve, 180));
          }

          const collected = new Map();
          const collectVisibleSegments = () => {
            for (const segment of readTranscriptPanel()) {
              const key = segment.time ? `${segment.time}\u0000${segment.text}` : segment.text;
              if (!collected.has(key)) collected.set(key, segment.text);
            }
          };
          let stablePasses = 0;
          let previousCount = -1;
          for (let pass = 0; pass < 60; pass += 1) {
            collectVisibleSegments();
            if (scroller) scroller.scrollTop = scroller.scrollHeight;
            await new Promise((resolve) => setTimeout(resolve, 120));
            collectVisibleSegments();
            if (collected.size === previousCount) {
              stablePasses += 1;
            } else {
              stablePasses = 0;
            }
            previousCount = collected.size;
            if (scroller) scroller.scrollTop += Math.max(1, scroller.clientHeight * 0.8);
            if (stablePasses >= 4) break;
          }

          return makeTranscript([...collected.values()]);
        };

        if (isYouTube) {
          const panelTranscript = await getTranscriptFromPage();
          if (panelTranscript) return { text: panelTranscript };
        }

        let youtubeTranscript = '';
        let lastFetchError = null;
        for (const sourceUrl of new Set(captionUrls)) {
          const originalParams = new URL(sourceUrl).searchParams;
          for (const format of ['json3', 'srv3', 'srv1', 'ttml', 'vtt']) {
            const url = new URL(sourceUrl);
            url.searchParams.set('fmt', format);
            url.searchParams.delete('xosf');
            for (const [key, value] of originalParams) {
              if (key !== 'xosf' && !url.searchParams.has(key)) url.searchParams.append(key, value);
            }

            try {
              const response = await fetch(url.toString(), { credentials: 'include' });
              if (!response.ok) {
                lastFetchError = new Error(`YouTube ответил ${response.status} при загрузке субтитров.`);
                continue;
              }
              youtubeTranscript = parseSubtitleBody(await response.text());
              if (youtubeTranscript) break;
            } catch (error) {
              lastFetchError = error;
            }
          }

          if (youtubeTranscript) return { text: youtubeTranscript };
        }

        if (lastFetchError && location.hostname.endsWith('youtube.com') && !document.querySelector('video')) {
          throw lastFetchError;
        }
        if (location.hostname.endsWith('youtube.com') && captionUrls.length) {
          throw new Error(lastFetchError
            ? `Дорожка найдена, но YouTube не отдал её: ${lastFetchError.message}`
            : 'Дорожка найдена, но ответ YouTube не удалось разобрать.');
        }
        if (isYouTube) {
          throw new Error('Не удалось прочитать расшифровку. Откройте в YouTube меню видео → «Расшифровка» и повторите экспорт.');
        }

        const videos = [...document.querySelectorAll('video')];
        videos.sort((left, right) => {
          const leftScore = (left.paused ? 0 : 1000000) + left.videoWidth * left.videoHeight;
          const rightScore = (right.paused ? 0 : 1000000) + right.videoWidth * right.videoHeight;
          return rightScore - leftScore;
        });

        const video = videos[0];
        if (!video) throw new Error('На этой странице не найдено видео.');

        const tracks = [...video.textTracks].filter((track) =>
          track.kind === 'subtitles' || track.kind === 'captions'
        );
        if (!tracks.length) {
          throw new Error('На странице не обнаружена доступная дорожка. Если это YouTube, обновите страницу и попробуйте ещё раз.');
        }

        const selectedTrack = tracks.find((track) => {
          const element = [...video.querySelectorAll('track')].find((item) => item.track === track);
          return element?.default;
        }) || tracks[0];
        const previousModes = tracks.map((track) => track.mode);
        let transcript = '';
        try {
          selectedTrack.mode = 'hidden';
          if (selectedTrack.readyState === 0 && !selectedTrack.cues?.length) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
          }

          const cues = selectedTrack.cues;
          transcript = cues ? makeTranscript([...cues].map((cue) => cue.text)) : '';
        } finally {
          tracks.forEach((track, index) => { track.mode = previousModes[index]; });
        }

        if (!transcript) throw new Error('Дорожка субтитров пуста или ещё не загружена.');
        return { text: transcript };
      }
    });

    const transcript = result?.result?.text;
    if (!transcript) throw new Error('Субтитры не найдены.');

    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'subt.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setStatus('Файл subt.txt сохранён', 'success');
  } catch (error) {
    setStatus(error.message || 'Не удалось получить субтитры.', 'error');
  } finally {
    exportButton.disabled = false;
  }
});

function setStatus(message, state = '') {
  statusText.textContent = message;
  if (state) status.dataset.state = state;
  else delete status.dataset.state;
}