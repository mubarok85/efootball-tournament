import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './CreateTournamentWizard.css'

const FORMATS = [
  {
    value: 'league',
    title: 'League',
    description: 'All-vs-all in a single group.'
  },
  {
    value: 'multi_group_league',
    title: 'Multi-Group League',
    description: 'Multiple groups, standings only, no knockouts.'
  },
  {
    value: 'knockout',
    title: 'Knockout',
    description: 'Direct elimination bracket.'
  },
  {
    value: 'league_final',
    title: 'League + Final',
    description: 'League phase followed by a final match.'
  },
  {
    value: 'league_knockout',
    title: 'League + Knockout',
    description: 'League phase followed by a full knockout stage.'
  },
  {
    value: 'multi_group_tournament',
    title: 'Multi-Group Tournament',
    description: 'Multiple groups, then top players qualify for knockouts.'
  }
]

const initialForm = {
  name: '',
  season: new Date().getFullYear().toString(),
  description: '',
  participant_type: 'individual',
  format: 'league',
  number_of_groups: 2,
  qualifiers_per_group: 2,
  qualifiers_count: 4,
  double_round_robin: false,
  two_legged_knockout: false,
  enable_bronze_final: false
}

function CreateTournamentWizard({
  user,
  onCancel,
  onCreated
}) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initialForm)

  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')

  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview)
      }
    }
  }, [logoPreview])

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value
    }))
  }

  function handleLogo(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Logo must be smaller than 5 MB.')
      return
    }

    if (logoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview)
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setError('')
  }

  function validateStepOne() {
    if (!form.name.trim()) {
      setError('Tournament name is required.')
      return false
    }

    if (!form.season.trim()) {
      setError('Season is required.')
      return false
    }

    setError('')
    return true
  }

  function validateStepTwo() {
    if (!form.participant_type) {
      setError('Please select a participant type.')
      return false
    }

    if (!form.format) {
      setError('Please select a tournament format.')
      return false
    }

    setError('')
    return true
  }

  function validateStepThree() {
    if (
      [
        'multi_group_league',
        'multi_group_tournament'
      ].includes(form.format)
      &&
      Number(form.number_of_groups) < 2
    ) {
      setError('Number of groups must be at least 2.')
      return false
    }

    if (
      form.format === 'multi_group_tournament'
      &&
      Number(form.qualifiers_per_group) < 1
    ) {
      setError('Qualifiers per group must be at least 1.')
      return false
    }

    if (
      form.format === 'league_knockout'
      &&
      Number(form.qualifiers_count) < 2
    ) {
      setError('At least 2 players must qualify for the knockout stage.')
      return false
    }

    setError('')
    return true
  }

  function nextStep() {
    if (step === 1 && !validateStepOne()) {
      return
    }

    if (step === 2 && !validateStepTwo()) {
      return
    }

    setStep((current) => Math.min(current + 1, 3))
  }

  function previousStep() {
    setError('')
    setStep((current) => Math.max(current - 1, 1))
  }

  function createSlug(name) {
    const cleanName = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    return `${cleanName}-${Date.now().toString(36)}`
  }

  function usesGroups() {
    return [
      'multi_group_league',
      'multi_group_tournament'
    ].includes(form.format)
  }

  function usesQualifiersPerGroup() {
    return form.format === 'multi_group_tournament'
  }

  function usesLeagueQualifiers() {
    return form.format === 'league_knockout'
  }

  function usesDoubleRoundRobin() {
    return [
      'league',
      'multi_group_league',
      'league_final',
      'league_knockout',
      'multi_group_tournament'
    ].includes(form.format)
  }

  function usesTwoLeggedKnockout() {
    return [
      'knockout',
      'league_knockout',
      'multi_group_tournament'
    ].includes(form.format)
  }

  async function uploadLogo() {
    if (!logoFile) {
      return {
        logoUrl: null,
        uploadedPath: null
      }
    }

    const extension =
      logoFile.name
        .split('.')
        .pop()
        ?.toLowerCase() || 'png'

    const filePath =
      `${user.id}/${crypto.randomUUID()}.${extension}`

    const {
      error: uploadError
    } = await supabase.storage
      .from('tournament-logos')
      .upload(
        filePath,
        logoFile,
        {
          cacheControl: '3600',
          upsert: false
        }
      )

    if (uploadError) {
      throw uploadError
    }

    const {
      data
    } = supabase.storage
      .from('tournament-logos')
      .getPublicUrl(filePath)

    return {
      logoUrl: data.publicUrl,
      uploadedPath: filePath
    }
  }

  async function createTournament() {
    if (!validateStepThree()) {
      return
    }

    setCreating(true)
    setError('')

    let uploadedPath = null

    try {
      const uploadResult =
        await uploadLogo()

      uploadedPath =
        uploadResult.uploadedPath

      const groupFormat = usesGroups()

      const {
        data,
        error: insertError
      } = await supabase
        .from('tournaments')
        .insert({
          owner_id: user.id,

          name:
            form.name.trim(),

          slug:
            createSlug(form.name),

          game:
            'eFootball',

          description:
            form.description.trim()
              ? form.description.trim()
              : null,

          logo_url:
            uploadResult.logoUrl,

          season:
            form.season.trim(),

          participant_type:
            form.participant_type,

          format:
            form.format,

          number_of_groups:
            groupFormat
              ? Number(form.number_of_groups)
              : null,

          qualifiers_per_group:
            usesQualifiersPerGroup()
              ? Number(form.qualifiers_per_group)
              : null,

          qualifiers_count:
            usesLeagueQualifiers()
              ? Number(form.qualifiers_count)
              : null,

          double_round_robin:
            usesDoubleRoundRobin()
              ? form.double_round_robin
              : false,

          two_legged_knockout:
            usesTwoLeggedKnockout()
              ? form.two_legged_knockout
              : false,

          enable_bronze_final:
            ['knockout', 'league_knockout', 'multi_group_tournament'].includes(form.format)
              ? form.enable_bronze_final
              : false,

          status:
            'draft'
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      if (onCreated) {
        await onCreated(data)
      }
    } catch (createError) {
      console.error(createError)

      if (uploadedPath) {
        await supabase.storage
          .from('tournament-logos')
          .remove([uploadedPath])
      }

      setError(
        createError.message ||
        'Unable to create tournament.'
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="wizard-page">
      <div className="wizard-shell">
        <header className="wizard-header">
          <div>
            <p className="wizard-eyebrow">
              CREATE TOURNAMENT
            </p>

            <h1>
              New Tournament
            </h1>

            <p>
              Configure your competition before adding participants.
            </p>
          </div>

          <button
            type="button"
            className="wizard-close"
            onClick={onCancel}
          >
            Close
          </button>
        </header>

        <div className="wizard-progress">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className={
                item <= step
                  ? 'progress-bar active'
                  : 'progress-bar'
              }
            />
          ))}
        </div>

        <p className="step-label">
          STEP {step} OF 3
        </p>

        {step === 1 && (
          <section className="wizard-card">
            <h2>
              Basic Information
            </h2>

            <div className="logo-field">
              <label>
                Logo
              </label>

              <div className="logo-row">
                <div className="logo-preview">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Tournament logo preview"
                    />
                  ) : (
                    <span className="trophy-icon">
                      🏆
                    </span>
                  )}
                </div>

                <label className="upload-button">
                  Upload Image

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogo}
                    hidden
                  />
                </label>
              </div>
            </div>

            <div className="wizard-field">
              <label>
                Name *
              </label>

              <input
                type="text"
                value={form.name}
                placeholder="Winter Championship 2026"
                onChange={(event) =>
                  updateField(
                    'name',
                    event.target.value
                  )
                }
              />
            </div>

            <div className="wizard-field">
              <label>
                Season
              </label>

              <input
                type="text"
                value={form.season}
                placeholder="2026"
                onChange={(event) =>
                  updateField(
                    'season',
                    event.target.value
                  )
                }
              />
            </div>

            <div className="wizard-field">
              <label>
                Description
              </label>

              <textarea
                value={form.description}
                rows="5"
                placeholder="Tell participants about this tournament."
                onChange={(event) =>
                  updateField(
                    'description',
                    event.target.value
                  )
                }
              />
            </div>

            <div className="wizard-actions end">
              <button
                type="button"
                className="wizard-primary"
                onClick={nextStep}
              >
                Next
                <span>→</span>
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="wizard-card">
            <h2>
              Participants & Format
            </h2>

            <div className="wizard-section">
              <h3>
                Participant Type
              </h3>

              <div className="participant-grid">
                <ChoiceCard
                  selected={
                    form.participant_type ===
                    'individual'
                  }
                  title="Individual (1v1)"
                  description="Players compete solo."
                  onClick={() =>
                    updateField(
                      'participant_type',
                      'individual'
                    )
                  }
                />

                <ChoiceCard
                  selected={
                    form.participant_type ===
                    'team'
                  }
                  title="Team (2v2)"
                  description="Two-player teams."
                  onClick={() =>
                    updateField(
                      'participant_type',
                      'team'
                    )
                  }
                />
              </div>
            </div>

            <div className="wizard-section">
              <h3>
                Tournament Format
              </h3>

              <div className="format-list">
                {FORMATS.map((format) => (
                  <ChoiceCard
                    key={format.value}
                    selected={
                      form.format ===
                      format.value
                    }
                    title={format.title}
                    description={
                      format.description
                    }
                    onClick={() =>
                      updateField(
                        'format',
                        format.value
                      )
                    }
                  />
                ))}
              </div>
            </div>

            <div className="wizard-actions">
              <button
                type="button"
                className="wizard-secondary"
                onClick={previousStep}
              >
                Back
              </button>

              <button
                type="button"
                className="wizard-primary"
                onClick={nextStep}
              >
                Next
                <span>→</span>
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="wizard-card">
            <h2>
              Configuration
            </h2>

            {usesGroups() && (
              <div className="wizard-field">
                <label>
                  Number of Groups
                </label>

                <input
                  type="number"
                  min="2"
                  value={form.number_of_groups}
                  onChange={(event) =>
                    updateField(
                      'number_of_groups',
                      event.target.value
                    )
                  }
                />

                <small>
                  Groups will be automatically named A, B, C, and so on.
                </small>
              </div>
            )}

            {usesQualifiersPerGroup() && (
              <div className="wizard-field">
                <label>
                  Qualifiers Per Group
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    form.qualifiers_per_group
                  }
                  onChange={(event) =>
                    updateField(
                      'qualifiers_per_group',
                      event.target.value
                    )
                  }
                />

                <small>
                  The top players from every group will advance to the knockout stage.
                </small>
              </div>
            )}

            {usesLeagueQualifiers() && (
              <div className="wizard-field">
                <label>
                  Knockout Qualifiers
                </label>

                <input
                  type="number"
                  min="2"
                  value={
                    form.qualifiers_count
                  }
                  onChange={(event) =>
                    updateField(
                      'qualifiers_count',
                      event.target.value
                    )
                  }
                />

                <small>
                  The top players in the league table will qualify for the knockout stage.
                </small>
              </div>
            )}

            {form.format === 'league_final' && (
              <div className="configuration-note">
                <strong>
                  Final Qualification
                </strong>

                <p>
                  The top two players in the league standings will automatically qualify for the final.
                </p>
              </div>
            )}

            {usesDoubleRoundRobin() && (
              <ToggleCard
                title="Double Round Robin"
                description="Each pair plays twice, with home and away fixtures."
                checked={
                  form.double_round_robin
                }
                onChange={(checked) =>
                  updateField(
                    'double_round_robin',
                    checked
                  )
                }
              />
            )}

            {usesTwoLeggedKnockout() && (
              <ToggleCard
                title="Two-Legged Knockout Ties"
                description="Knockout ties use two matches and aggregate scoring, while the final remains a single match."
                checked={
                  form.two_legged_knockout
                }
                onChange={(checked) =>
                  updateField(
                    'two_legged_knockout',
                    checked
                  )
                }
              />
            )}

            {['knockout', 'league_knockout', 'multi_group_tournament'].includes(form.format) && (
              <ToggleCard
                title="Bronze Final"
                description="The two losing semi-finalists will automatically play for 3rd place."
                checked={
                  form.enable_bronze_final
                }
                onChange={(checked) =>
                  updateField(
                    'enable_bronze_final',
                    checked
                  )
                }
              />
            )}

            {form.format === 'league' && (
              <div className="configuration-note">
                <strong>
                  League Format
                </strong>

                <p>
                  Final ranking will be determined from the league standings.
                </p>
              </div>
            )}

            {form.format === 'multi_group_league' && (
              <div className="configuration-note">
                <strong>
                  Group League Format
                </strong>

                <p>
                  Every group will maintain its own standings, without a knockout stage.
                </p>
              </div>
            )}

            {error && (
              <div className="wizard-error">
                {error}
              </div>
            )}

            <div className="wizard-actions">
              <button
                type="button"
                className="wizard-secondary"
                onClick={previousStep}
              >
                Back
              </button>

              <button
                type="button"
                className="wizard-primary create"
                disabled={creating}
                onClick={createTournament}
              >
                {creating
                  ? 'Creating...'
                  : '✓ Create Tournament'}
              </button>
            </div>
          </section>
        )}

        {error && step !== 3 && (
          <div className="wizard-error outside">
            {error}
          </div>
        )}
      </div>
    </main>
  )
}

function ChoiceCard({
  selected,
  title,
  description,
  onClick
}) {
  return (
    <button
      type="button"
      className={
        selected
          ? 'choice-card selected'
          : 'choice-card'
      }
      onClick={onClick}
    >
      <span className="radio-circle">
        {selected && (
          <span />
        )}
      </span>

      <span className="choice-copy">
        <strong>
          {title}
        </strong>

        <small>
          {description}
        </small>
      </span>
    </button>
  )
}

function ToggleCard({
  title,
  description,
  checked,
  onChange
}) {
  return (
    <div className="toggle-card">
      <div>
        <strong>
          {title}
        </strong>

        <p>
          {description}
        </p>
      </div>

      <button
        type="button"
        className={
          checked
            ? 'toggle active'
            : 'toggle'
        }
        onClick={() =>
          onChange(!checked)
        }
        aria-pressed={checked}
      >
        <span />
      </button>
    </div>
  )
}

export default CreateTournamentWizard
