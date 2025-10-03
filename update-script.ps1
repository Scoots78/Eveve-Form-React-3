$lines = Get-Content src\components\ReservationForm.jsx
$newLines = @()
$skipNext = $false

for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($skipNext) {
        $skipNext = $false
        continue
    }
    
    $line = $lines[$i]
    
    # 1. After import at line 37, add new imports
    if ($i -eq 37) {
        $newLines += $line
        $newLines += "// Import EventCarousel component and date utilities"
        $newLines += "import EventCarousel from `"./EventCarousel`";"
        $newLines += "import { generateDateRange } from `"../utils/dateConversion`";"
        continue
    }
    
    # 2. After disabled dates closing, add eventDates
    if (($i -ge 373) -and ($line -match "^\s*\[monthClosedDates\]$")) {
        $newLines += $line
        $newLines += "  );"
        $newLines += ""
        $newLines += "  /* ------------------------------------------------------------------"
        $newLines += "     Derive flat array of all event dates for calendar highlighting"
        $newLines += "  ------------------------------------------------------------------ */"
        $newLines += "  const eventDates = useMemo(() => {"
        $newLines += "    if (!appConfig?.eventsB || !Array.isArray(appConfig.eventsB)) {"
        $newLines += "      return [];"
        $newLines += "    }"
        $newLines += "    "
        $newLines += "    // Filter events with showCal: true and generate their date ranges"
        $newLines += "    const allEventDates = [];"
        $newLines += "    appConfig.eventsB.forEach(event => {"
        $newLines += "      if (event.showCal === true && event.from && event.to) {"
        $newLines += "        const dates = generateDateRange(event.from, event.to);"
        $newLines += "        allEventDates.push(...dates);"
        $newLines += "      }"
        $newLines += "    });"
        $newLines += "    "
        $newLines += "    return allEventDates;"
        $newLines += "  }, [appConfig?.eventsB]);"
        $skipNext = $true
        continue
    }
    
    # 3. After handleGuestsChange, add handleEventDateSelect
    if (($i -ge 429) -and ($line -match "^\s*\};$") -and ($lines[$i-5] -match "handleGuestsChange")) {
        $newLines += $line
        $newLines += ""
        $newLines += ""
        $newLines += "  const handleEventDateSelect = (date, event) => {"
        $newLines += "    console.log('Event date selected:', date, event);"
        $newLines += "    setSelectedDate(date);"
        $newLines += "    const currentGuests = parseInt(guests, 10);"
        $newLines += "    if (isNaN(currentGuests) || currentGuests < event.min || currentGuests > event.max) {"
        $newLines += "      setGuests(String(event.min));"
        $newLines += "    }"
        $newLines += "    setAvailabilityData(null);"
        $newLines += "    setApiError(null);"
        $newLines += "    setShowDateTimePicker(false);"
        $newLines += "    setSelectedAddons({ menus: [], options: {} });"
        $newLines += "    setAvailableAreas([]);"
        $newLines += "    setSelectedArea(null);"
        $newLines += "    setSelectedAreaName(null);"
        $newLines += "    setTimeout(() => {"
        $newLines += "      const availabilitySection = document.querySelector('.availability-section');"
        $newLines += "      if (availabilitySection) {"
        $newLines += "        availabilitySection.scrollIntoView({ behavior: 'smooth', block: 'start' });"
        $newLines += "      }"
        $newLines += "    }, 100);"
        $newLines += "  };"
        continue
    }
    
    # 4. At h1 line, add EventCarousel after
    if (($i -eq 1317) -and ($lines[$i-1] -match "makeBookingAtTitlePrefix")) {
        $newLines += $line
        $newLines += ""
        $newLines += "      {/* Event Carousel Section */}"
        $newLines += "      {appConfig?.eventsB && appConfig.eventsB.length > 0 && ("
        $newLines += "        <EventCarousel"
        $newLines += "          events={appConfig.eventsB}"
        $newLines += "          onDateSelect={handleEventDateSelect}"
        $newLines += "          languageStrings={appConfig?.lng || {}}"
        $newLines += "          timeFormat={appConfig?.timeFormat}"
        $newLines += "          dateFormat={appConfig?.dateFormat}"
        $newLines += "        />"
        $newLines += "      )}"
        continue
    }
    
    # 5. Add eventDates prop to ReactCalendarPicker
    if ($line -match "disabledDates=\{disabledDates\}$") {
        $newLines += $line
        $newLines += "                  eventDates={eventDates}"
        continue
    }
    
    # 6. Add availability-section class
    if (($line -match "availabilityData && !isLoading && !apiError") -and ($lines[$i+1] -match "mt-6 space-y-5")) {
        $newLines += $line
        $i++
        $newLines += "        <div className=`"availability-section mt-6 space-y-5`">"
        $skipNext = $true
        continue
    }
    
    $newLines += $line
}

Set-Content -Path "src\components\ReservationForm.jsx" -Value $newLines
Write-Host "Successfully updated ReservationForm.jsx"
