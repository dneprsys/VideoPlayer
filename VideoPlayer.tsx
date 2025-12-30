/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
// Copyright 2024 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import c from 'classnames';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {timeToSecs} from './utils';

const formatTime = (t) =>
  `${Math.floor(t / 60)}:${Math.floor(t % 60)
    .toString()
    .padStart(2, '0')}`;

export default function VideoPlayer({
  url,
  timecodeList,
  seekOperation,
  isLoadingVideo,
  videoError,
  jumpToTimecode,
}) {
  const [video, setVideo] = useState(null);
  const [duration, setDuration] = useState(0);
  const [scrubberTime, setScrubberTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [currentData, setCurrentData] = useState(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const currentSecs = duration * scrubberTime || 0;
  const currentPercent = scrubberTime * 100;
  const timecodeListReversed = useMemo(
    () => timecodeList?.toReversed(),
    [timecodeList],
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying, video]);

  const updateDuration = () => setDuration(video.duration);

  const updateTime = () => {
    if (!isScrubbing) {
      setScrubberTime(video.currentTime / video.duration);
    }

    if (timecodeList) {
      setCurrentData(
        timecodeListReversed.find(
          (t) => timeToSecs(t.time) <= video.currentTime,
        ),
      );
    }
  };

  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);

  const cyclePlaybackRate = () => {
    const rates = [0.5, 1, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  useEffect(() => {
    setScrubberTime(0);
    setIsPlaying(false);
    setPlaybackRate(1);
    setCurrentData(null);
  }, [url]);

  useEffect(() => {
    if (video && seekOperation) {
      video.currentTime = seekOperation.time;
    }
  }, [video, seekOperation]);

  useEffect(() => {
    if (video) {
      video.volume = isMuted ? 0 : volume;
    }
  }, [video, volume, isMuted]);

  useEffect(() => {
    if (video) {
      video.playbackRate = playbackRate;
    }
  }, [video, playbackRate]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyPress = (e) => {
      if (
        e.target.tagName !== 'INPUT' &&
        e.target.tagName !== 'TEXTAREA' &&
        e.key === ' '
      ) {
        togglePlay();
      }
    };

    addEventListener('keypress', onKeyPress);

    return () => {
      removeEventListener('keypress', onKeyPress);
    };
  }, [togglePlay]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <div className="videoPlayer" ref={playerRef}>
      {url && !isLoadingVideo ? (
        <>
          <div className="videoStage">
            <div className="videoWrapper">
              <video
                src={url}
                ref={setVideo}
                onClick={togglePlay}
                preload="auto"
                crossOrigin="anonymous"
                onDurationChange={updateDuration}
                onTimeUpdate={updateTime}
                onPlay={onPlay}
                onPause={onPause}
              />
              {currentData?.objects?.map((obj, i) => {
                if (!obj.box_2d) return null;
                const [ymin, xmin, ymax, xmax] = obj.box_2d;
                return (
                  <div
                    key={i}
                    className="boundingBox"
                    style={{
                      top: `${ymin * 100}%`,
                      left: `${xmin * 100}%`,
                      height: `${(ymax - ymin) * 100}%`,
                      width: `${(xmax - xmin) * 100}%`,
                    }}>
                    <span className="label">
                      {obj.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {currentData?.text && (
              <div className="videoCaption">{currentData.text}</div>
            )}
          </div>

          <div className="videoControls">
            <div className="videoScrubber">
              <input
                style={{'--pct': `${currentPercent}%`} as React.CSSProperties}
                type="range"
                min="0"
                max="1"
                value={scrubberTime || 0}
                step="0.000001"
                onChange={(e) => {
                  setScrubberTime(e.target.valueAsNumber);
                  video.currentTime = e.target.valueAsNumber * duration;
                }}
                onPointerDown={() => setIsScrubbing(true)}
                onPointerUp={() => setIsScrubbing(false)}
              />
            </div>
            <div className="timecodeMarkers">
              {timecodeList?.map(({time, text, value}, i) => {
                const secs = timeToSecs(time);
                const pct = (secs / duration) * 100;

                return (
                  <div
                    className="timecodeMarker"
                    key={i}
                    style={{left: `${pct}%`}}>
                    <div
                      className="timecodeMarkerTick"
                      onClick={() => jumpToTimecode(secs)}>
                      <div />
                    </div>
                    <div
                      className={c('timecodeMarkerLabel', {right: pct > 50})}>
                      <div>{time}</div>
                      <p>{value || text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="videoTime">
              <div className="controlsLeft">
                <button onClick={togglePlay}>
                  <span className="icon">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>

                <div className="volumeControl">
                  <button onClick={toggleMute}>
                    <span className="icon">
                      {isMuted || volume === 0 ? 'volume_off' : 'volume_up'}
                    </span>
                  </button>
                  <input
                    className="volumeSlider"
                    style={
                      {
                        '--pct': `${(isMuted ? 0 : volume) * 100}%`,
                      } as React.CSSProperties
                    }
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(e.target.valueAsNumber);
                      setIsMuted(e.target.valueAsNumber === 0);
                    }}
                  />
                </div>

                <span className="timeDisplay">
                  {formatTime(currentSecs)} / {formatTime(duration)}
                </span>
              </div>

              <div className="controlsRight">
                <button className="speedButton" onClick={cyclePlaybackRate}>
                  {playbackRate}x
                </button>
                <button onClick={toggleFullscreen}>
                  <span className="icon">
                    {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="emptyVideo">
          <p>
            {isLoadingVideo
              ? 'Processing video...'
              : videoError
                ? 'Error processing video.'
                : 'Drag and drop a video file here to get started.'}
          </p>
        </div>
      )}
    </div>
  );
}