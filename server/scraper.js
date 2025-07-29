import axios from 'axios';
import * as cheerio from 'cheerio';

function parseDuration(s) {
  return [s / 3600, s / 60 % 60, s % 60].map(v => Math.floor(v).toString().padStart(2, '0')).join(':');
}

export async function instagramDl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axios.post(
        'https://yt1s.io/api/ajaxSearch',
        new URLSearchParams({ q: url, w: '', p: 'home', lang: 'en' }),
        {
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Origin': 'https://yt1s.io',
            'Referer': 'https://yt1s.io/',
            'User-Agent': 'Postify/1.0.0',
          },
        }
      );
      const $ = cheerio.load(data.data);
      let result = $('a.abutton.is-success.is-fullwidth.btn-premium')
        .map((_, b) => ({
          title: $(b).attr('title'),
          url: $(b).attr('href'),
        }))
        .get();
      resolve(result);
    } catch (e) {
      reject(e);
    }
  });
}

export async function tiktokDl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      let data = [];

      function formatNumber(integer) {
        return Number(parseInt(integer)).toLocaleString().replace(/,/g, '.');
      }

      function formatDate(n, locale = 'en') {
        return new Date(n).toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
        });
      }

      const res = (
        await axios.post(
          'https://www.tikwm.com/api/',
          {},
          {
            headers: {
              'Accept': 'application/json, text/javascript, */*; q=0.01',
              'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'Origin': 'https://www.tikwm.com',
              'Referer': 'https://www.tikwm.com/',
              'User-Agent': 'Mozilla/5.0',
            },
            params: { url: url, hd: 1 },
          }
        )
      ).data.data;

      if (!res.size && !res.wm_size && !res.hd_size) {
        res.images.map((v) => data.push({ type: 'photo', url: v }));
      } else {
        if (res.wmplay) data.push({ type: 'watermark', url: res.wmplay });
        if (res.play) data.push({ type: 'nowatermark', url: res.play });
        if (res.hdplay) data.push({ type: 'nowatermark_hd', url: res.hdplay });
      }

      resolve({
        ...res,
        status: true,
        title: res.title,
        taken_at: formatDate(res.create_time).replace('1970', ''),
        region: res.region,
        id: res.id,
        durations: res.duration,
        duration: res.duration + ' Seconds',
        cover: res.cover,
        size_wm: res.wm_size,
        size_nowm: res.size,
        size_nowm_hd: res.hd_size,
        data: data,
        music_info: {
          id: res.music_info.id,
          title: res.music_info.title,
          author: res.music_info.author,
          album: res.music_info.album || null,
          url: res.music || res.music_info.play,
        },
        stats: {
          views: formatNumber(res.play_count),
          likes: formatNumber(res.digg_count),
          comment: formatNumber(res.comment_count),
          share: formatNumber(res.share_count),
          download: formatNumber(res.download_count),
        },
        author: {
          id: res.author.id,
          fullname: res.author.unique_id,
          nickname: res.author.nickname,
          avatar: res.author.avatar,
        },
      });
    } catch (e) {
      reject(e);
    }
  });
}

export async function facebookDl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axios.post(
        'https://getmyfb.com/process',
        new URLSearchParams({
          id: decodeURIComponent(url),
          locale: 'en',
        }),
        {
          headers: {
            'hx-current-url': 'https://getmyfb.com/',
            'hx-request': 'true',
            'hx-target': url.includes('share')
              ? '#private-video-downloader'
              : '#target',
            'hx-trigger': 'form',
            'hx-post': '/process',
            'hx-swap': 'innerHTML',
          },
        }
      );
      const $ = cheerio.load(data);
      resolve({
        caption: $('.results-item-text').text().trim() || '',
        preview: $('.results-item-image').attr('src') || '',
        results: $('.results-list-item')
          .get()
          .map((el) => ({
            quality: parseInt($(el).text().trim()) || '',
            type: $(el).text().includes('HD') ? 'HD' : 'SD',
            url: $(el).find('a').attr('href') || '',
          })),
      });
    } catch (e) {
      reject(e);
    }
  });
}

export async function pinterestDl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      // Try first API method
      let result;
      try {
        const { data } = await axios.post(
          'https://pinterestvideodownloader.com/download.php',
          new URLSearchParams({ url: url }),
          {
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Content-Type': 'application/x-www-form-urlencoded',
              'Origin': 'https://pinterestvideodownloader.com',
              'Referer': 'https://pinterestvideodownloader.com/',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          }
        );

        const $ = cheerio.load(data);
        const results = [];

        // Look for download links
        $('a[href*="https://"]').each((i, el) => {
          const downloadUrl = $(el).attr('href');
          const text = $(el).text().trim().toLowerCase();
          
          if (downloadUrl && (downloadUrl.includes('.jpg') || downloadUrl.includes('.png') || downloadUrl.includes('.mp4') || downloadUrl.includes('.gif'))) {
            const isVideo = downloadUrl.includes('.mp4') || text.includes('video');
            results.push({
              url: downloadUrl,
              title: isVideo ? 'Video Download' : 'Image Download',
              type: isVideo ? 'video' : 'image'
            });
          }
        });

        if (results.length > 0) {
          result = {
            status: true,
            title: $('title').text() || 'Pinterest Content',
            description: '',
            results: results
          };
        }
      } catch (e) {
        console.log('First method failed, trying alternative...');
      }

      // Try alternative API if first failed
      if (!result) {
        try {
          const { data } = await axios.post(
            'https://pinterestvideodl.com/download',
            new URLSearchParams({ url: url }),
            {
              headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://pinterestvideodl.com',
                'Referer': 'https://pinterestvideodl.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            }
          );

          if (data && typeof data === 'object') {
            const results = [];
            
            if (data.video_url) {
              results.push({
                url: data.video_url,
                title: 'Video Download',
                type: 'video'
              });
            }
            
            if (data.image_url) {
              results.push({
                url: data.image_url,
                title: 'Image Download', 
                type: 'image'
              });
            }

            if (results.length > 0) {
              result = {
                status: true,
                title: data.title || 'Pinterest Content',
                description: data.description || '',
                results: results
              };
            }
          }
        } catch (e) {
          console.log('Second method failed, trying direct extraction...');
        }
      }

      // Try direct URL extraction as last resort
      if (!result) {
        // Extract Pinterest ID from URL
        const pinIdMatch = url.match(/pin\/(\d+)/);
        if (pinIdMatch) {
          const pinId = pinIdMatch[1];
          
          // Try to construct direct media URLs
          const results = [
            {
              url: `https://i.pinimg.com/originals/${pinId.slice(-2)}/${pinId.slice(-4, -2)}/${pinId.slice(-6, -4)}/${pinId}.jpg`,
              title: 'High Quality Image',
              type: 'image'
            },
            {
              url: `https://i.pinimg.com/736x/${pinId.slice(-2)}/${pinId.slice(-4, -2)}/${pinId.slice(-6, -4)}/${pinId}.jpg`,
              title: 'Standard Quality Image',
              type: 'image'
            }
          ];

          result = {
            status: true,
            title: 'Pinterest Content',
            description: 'Extracted from Pinterest URL',
            results: results
          };
        }
      }

      if (!result || !result.results || result.results.length === 0) {
        throw new Error('Could not extract downloadable content from Pinterest URL');
      }

      resolve(result);
    } catch (e) {
      reject(new Error(`Pinterest download failed: ${e.message}`));
    }
  });
}

export async function youtubeDl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      let result;

      // Method 1: Try Y2mate API
      try {
        const { data } = await axios.post(
          'https://www.y2mate.com/mates/en441/ajax/search',
          new URLSearchParams({
            k_query: url,
            k_page: 'home',
            hl: 'en',
            q_auto: '0'
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'Origin': 'https://www.y2mate.com',
              'Referer': 'https://www.y2mate.com/',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }
        );

        if (data.status === 'ok') {
          const $ = cheerio.load(data.data);
          const title = $('.media-info h3').text().trim();
          const duration = $('.media-info .duration').text().trim();
          
          const video = [];
          const audio = [];

          $('.video-quality .btn-success').each((i, el) => {
            const quality = $(el).closest('tr').find('.video-quality').text().trim();
            const size = $(el).closest('tr').find('.size').text().trim();
            const k = $(el).attr('data-k');
            
            if (k) {
              video.push({
                height: quality.replace('p', ''),
                quality: quality,
                size: size,
                k: k
              });
            }
          });

          $('.audio-quality .btn-success').each((i, el) => {
            const bitrate = $(el).closest('tr').find('.audio-quality').text().trim();
            const size = $(el).closest('tr').find('.size').text().trim();
            const k = $(el).attr('data-k');
            
            if (k) {
              audio.push({
                bitrate: bitrate.replace(' kbps', ''),
                quality: bitrate,
                size: size,
                k: k
              });
            }
          });

          if (video.length > 0 || audio.length > 0) {
            result = {
              info: title,
              duration: duration,
              video: video,
              audio: audio
            };
          }
        }
      } catch (e) {
        console.log('Y2mate method failed, trying alternative...');
      }

      // Method 2: Try SaveTube API
      if (!result) {
        try {
          const { data } = await axios.post(
            'https://savetube.me/api/v1/info',
            { url: url },
            {
              headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://savetube.me',
                'Referer': 'https://savetube.me/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            }
          );

          if (data.status && data.data) {
            const video = data.data.video_formats ? data.data.video_formats.map(v => ({
              height: v.height || v.quality,
              quality: `${v.height}p` || v.quality,
              size: v.filesize || 'Unknown',
              url: v.url
            })) : [];

            const audio = data.data.audio_formats ? data.data.audio_formats.map(a => ({
              bitrate: a.abr || a.quality,
              quality: `${a.abr} kbps` || a.quality,
              size: a.filesize || 'Unknown',
              url: a.url
            })) : [];

            if (video.length > 0 || audio.length > 0) {
              result = {
                info: data.data.title,
                duration: data.data.duration_string || 'Unknown',
                video: video,
                audio: audio
              };
            }
          }
        } catch (e) {
          console.log('SaveTube method failed, trying NVL Group...');
        }
      }

      // Method 3: Fallback to NVL Group (original method)
      if (!result) {
        const nvlGroup = new NvlGroup();
        result = await nvlGroup.download(url);
      }

      if (!result || (!result.video && !result.audio)) {
        throw new Error('Could not extract download links from YouTube URL');
      }

      resolve(result);
    } catch (e) {
      reject(new Error(`YouTube download failed: ${e.message}`));
    }
  });
}

export class NvlGroup {
  constructor() {
    this.signature = null;
    this.timestamp = null;
  }

  async updateSignature() {
    const res = await axios.get('https://ytdownloader.nvlgroup.my.id/generate-signature');
    this.signature = res.data.signature;
    this.timestamp = res.data.timestamp;
  }

  async ensureSignature() {
    if (!this.signature || !this.timestamp || Date.now() - this.timestamp > 4 * 60 * 1000) {
      await this.updateSignature();
    }
  }

  async search(query) {
    await this.ensureSignature();
    const { data } = await axios.get(`https://ytdownloader.nvlgroup.my.id/web/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'x-server-signature': this.signature,
        'x-signature-timestamp': this.timestamp
      }
    });
    return data;
  }

  async info(url) {
    await this.ensureSignature();
    const { data } = await axios.get(`https://ytdownloader.nvlgroup.my.id/web/info?url=${encodeURIComponent(url)}`, {
      headers: {
        'x-server-signature': this.signature,
        'x-signature-timestamp': this.timestamp
      }
    });
    return data;
  }

  async download(url) {
    await this.ensureSignature();
    const info = await this.info(url);
    const video = info.resolutions.map(res => ({
      ...res,
      url: `https://ytdownloader.nvlgroup.my.id/web/download?url=${url}&resolution=${res.height}&signature=${this.signature}&timestamp=${this.timestamp}`
    }));
    const audio = info.audioBitrates.map(res => ({
      ...res,
      url: `https://ytdownloader.nvlgroup.my.id/web/audio?url=${url}&bitrate=${res.bitrate}&signature=${this.signature}&timestamp=${this.timestamp}`
    }));
    return { info, video, audio };
  }
}
