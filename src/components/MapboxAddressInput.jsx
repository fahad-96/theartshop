import React, { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";

const INDIA_BBOX = [68.1113787, 6.5546079, 97.395561, 35.6745457];
const JK_PROXIMITY = [74.7973, 34.0837];

export default function MapboxAddressInput({ value, onChange, onEdit }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [allowSuggestions, setAllowSuggestions] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [pickedAddress, setPickedAddress] = useState("");
  const [pickedCoords, setPickedCoords] = useState(null);
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  const abortRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapboxModuleRef = useRef(null);

  useEffect(() => {
    if (!isMapOpen) return undefined;

    const scrollY = window.scrollY;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyWidth = document.body.style.width;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.width = originalBodyWidth;
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isMapOpen]);

  const reverseGeocode = async (lng, lat) => {
    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`;
    const params = new URLSearchParams({
      access_token: token,
      language: "en",
      limit: "1",
      country: "IN",
    });

    const response = await fetch(`${endpoint}?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Unable to fetch address from map location.");
    }

    const data = await response.json();
    const feature = data.features?.[0];
    if (!feature) {
      throw new Error("No address found for this location.");
    }

    return feature.place_name;
  };

  const updatePinLocation = async (lng, lat) => {
    setPickedCoords({ lng, lat });
    setStatusMessage("Getting address for pinned location...");
    try {
      const address = await reverseGeocode(lng, lat);
      setPickedAddress(address);
      setStatusMessage("Pinned location ready.");
    } catch {
      setPickedAddress("");
      setStatusMessage("Could not resolve address for this location.");
    }
  };

  useEffect(() => {
    if (!token || !value || value.trim().length < 3 || !allowSuggestions || !isFocused) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      try {
        const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json`;
        const params = new URLSearchParams({
          access_token: token,
          autocomplete: "true",
          limit: "5",
          language: "en",
          types: "address,place,postcode,locality,neighborhood",
          country: "IN",
          bbox: INDIA_BBOX.join(","),
          proximity: JK_PROXIMITY.join(","),
        });

        const response = await fetch(`${endpoint}?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        const data = await response.json();
        setSuggestions(data.features || []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [token, value, allowSuggestions, isFocused]);

  useEffect(() => {
    if (!isMapOpen || !token || !mapContainerRef.current || mapRef.current) {
      return;
    }
    let isDisposed = false;

    const initMap = async () => {
      const mapboxgl = mapboxModuleRef.current
        ? mapboxModuleRef.current
        : (await import("mapbox-gl")).default;
      mapboxModuleRef.current = mapboxgl;

      if (isDisposed) return;

      mapboxgl.accessToken = token;
      const fallbackCenter = [74.7973, 34.0837];

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: fallbackCenter,
        zoom: 12,
        maxBounds: INDIA_BBOX,
        dragPan: true,
        scrollZoom: true,
        touchZoomRotate: true,
        interactive: true,
      });

      mapRef.current = map;

      map.on("load", () => {
        map.resize();
      });

      setTimeout(() => {
        if (mapRef.current) mapRef.current.resize();
      }, 100);

      map.on("click", async (event) => {
        const { lng, lat } = event.lngLat;

        if (!markerRef.current) {
          markerRef.current = new mapboxgl.Marker({ draggable: true })
            .setLngLat([lng, lat])
            .addTo(map);

          markerRef.current.on("dragend", async () => {
            const markerPosition = markerRef.current.getLngLat();
            await updatePinLocation(markerPosition.lng, markerPosition.lat);
          });
        } else {
          markerRef.current.setLngLat([lng, lat]);
        }

        await updatePinLocation(lng, lat);
      });
    };

    initMap();

    return () => {
      isDisposed = true;
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isMapOpen, token]);

  const handleUseCurrentAddress = () => {
    if (!token) {
      setStatusMessage("Mapbox token missing.");
      return;
    }

    if (!navigator.geolocation) {
      setStatusMessage("Geolocation is not supported by this browser.");
      return;
    }

    setIsLocating(true);
    setStatusMessage("Detecting your current location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { longitude, latitude } = position.coords;
          const address = await reverseGeocode(longitude, latitude);
          onChange(address);
          onEdit();
          setAllowSuggestions(false);
          setIsFocused(false);
          setSuggestions([]);
          setStatusMessage("Current address added.");
        } catch {
          setStatusMessage("Could not fetch address for your current location.");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setStatusMessage("Location permission denied or unavailable.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openMapPicker = () => {
    setIsMapOpen(true);
    setPickedAddress("");
    setPickedCoords(null);
    setStatusMessage("Click on the map to pin your address.");
  };

  const confirmPinnedAddress = () => {
    if (!pickedAddress) return;
    onChange(pickedAddress);
    onEdit();
    setAllowSuggestions(false);
    setIsFocused(false);
    setSuggestions([]);
    setIsMapOpen(false);
    setStatusMessage("Pinned address added.");
  };

  if (!token) {
    return (
      <>
        <textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onEdit();
          }}
          className="w-full min-h-28 bg-black/40 border border-white/20 px-4 py-3 outline-none focus:border-white"
          placeholder="Add your full delivery address"
        />
        <p className="text-xs text-amber-300/80">
          Add VITE_MAPBOX_TOKEN in .env to enable map-based address suggestions.
        </p>
      </>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onEdit();
          setAllowSuggestions(true);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setTimeout(() => {
            setIsFocused(false);
            setSuggestions([]);
          }, 120);
        }}
        className="w-full bg-black/40 border border-white/20 px-4 py-3 outline-none focus:border-white"
        placeholder="Start typing address (min 3 letters)"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openMapPicker}
          className="inline-flex items-center gap-2 border border-white/25 px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/85 hover:bg-white/10"
        >
          <MapPin size={14} />
          Select on Map
        </button>
        <button
          type="button"
          onClick={handleUseCurrentAddress}
          disabled={isLocating}
          className="inline-flex items-center gap-2 border border-white/25 px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/85 hover:bg-white/10 disabled:opacity-60"
        >
          <LocateFixed size={14} />
          {isLocating ? "Locating..." : "Add Current Address"}
        </button>
      </div>

      {isLoading && <p className="mt-2 text-xs text-white/60">Searching address...</p>}

      {!!suggestions.length && (
        <div className="absolute z-20 mt-2 w-full border border-white/15 bg-[#0e0e0e] max-h-64 overflow-auto">
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onChange(item.place_name);
                onEdit();
                setAllowSuggestions(false);
                setIsFocused(false);
                setSuggestions([]);
              }}
              className="w-full text-left px-4 py-3 text-sm text-white/85 hover:bg-white/10 border-b border-white/10 last:border-b-0"
            >
              {item.place_name}
            </button>
          ))}
        </div>
      )}

      {statusMessage && <p className="mt-2 text-xs text-white/65">{statusMessage}</p>}

      {isMapOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overscroll-none">
          <div className="w-full max-w-3xl border border-white/20 bg-[#0b0b0b] p-4 md:p-5">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h3 className="text-sm md:text-base uppercase tracking-[0.2em] text-white/85">Pin Address on Map</h3>
              <button
                type="button"
                onClick={() => setIsMapOpen(false)}
                className="text-xs uppercase tracking-[0.2em] text-white/70 hover:text-white"
              >
                Close
              </button>
            </div>

            <div ref={mapContainerRef} className="h-[360px] w-full border border-white/20 touch-none" />

            <p className="mt-3 text-xs text-white/65">
              Click anywhere on the map to place a pin. Drag the pin to refine your location.
            </p>
            {pickedCoords && (
              <p className="mt-2 text-xs text-white/55">
                Lng: {pickedCoords.lng.toFixed(5)} | Lat: {pickedCoords.lat.toFixed(5)}
              </p>
            )}
            {pickedAddress && <p className="mt-3 text-sm text-white/80">{pickedAddress}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={confirmPinnedAddress}
                disabled={!pickedAddress}
                className="bg-white text-black px-4 py-2 text-xs uppercase tracking-[0.18em] font-bold disabled:opacity-60"
              >
                Use This Address
              </button>
              <button
                type="button"
                onClick={() => setIsMapOpen(false)}
                className="border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-white/50">Powered by Mapbox Geocoding API.</p>
    </div>
  );
}
