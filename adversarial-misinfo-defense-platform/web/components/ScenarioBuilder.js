/**
 * Scenario Builder Component for Adversarial Misinformation Defense Platform Web UI
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import { FiPlus, FiTrash2, FiSave, FiPlay } from 'react-icons/fi';
import { toast } from 'react-toastify';

// Styled components
const Container = styled.div`
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  margin: 0;
  color: #2c3e50;
`;

const Button = styled.button`
  background-color: ${props => props.primary ? '#3498db' : '#95a5a6'};
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FormSection = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #2c3e50;
`;

const Input = styled(Field)`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const Select = styled(Field)`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background-color: white;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const ListContainer = styled.div`
  background: #f8f9fa;
  border-radius: 4px;
  padding: 1rem;
  margin-top: 0.5rem;
`;

const ListItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
  
  &:last-child {
    border-bottom: none;
  }
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  padding: 0.25rem;
  
  &:hover {
    color: #c0392b;
  }
`;

// Validation schema
const scenarioSchema = Yup.object().shape({
  name: Yup.string().required('Scenario name is required'),
  description: Yup.string().required('Description is required'),
  exercise_type: Yup.string().required('Exercise type is required'),
  difficulty: Yup.string().required('Difficulty level is required'),
  objectives: Yup.array().of(Yup.string().required('Objective cannot be empty')).min(1, 'At least one objective is required'),
  constraints: Yup.array().of(Yup.string()),
  success_criteria: Yup.array().of(Yup.string()),
  estimated_duration: Yup.number().min(1, 'Duration must be at least 1 minute').required('Estimated duration is required'),
  team_roles: Yup.array().of(Yup.string()).min(1, 'At least one team role is required'),
  threat_actors_involved: Yup.array().of(Yup.string()),
  detection_methods_to_test: Yup.array().of(Yup.string()),
  mitigation_strategies: Yup.array().of(Yup.string()),
});

// Exercise types
const exerciseTypes = [
  { value: 'social_engineering', label: 'Social Engineering' },
  { value: 'deepfake_detection', label: 'Deepfake Detection' },
  { value: 'meme_campaign', label: 'Meme Campaign' },
  { value: 'narrative_control', label: 'Narrative Control' },
  { value: 'coordination_disruption', label: 'Coordination Disruption' },
  { value: 'information_warfare', label: 'Information Warfare' },
  { value: 'psychological_operations', label: 'Psychological Operations' }
];

// Difficulty levels
const difficultyLevels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
  { value: 'custom', label: 'Custom' }
];

// Team roles
const teamRoles = [
  { value: 'red_team_attacker', label: 'Red Team Attacker' },
  { value: 'blue_team_defender', label: 'Blue Team Defender' },
  { value: 'white_team_observer', label: 'White Team Observer' },
  { value: 'gray_team_moderator', label: 'Gray Team Moderator' }
];

// Scenario Builder component
const ScenarioBuilder = () => {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Load existing scenarios
    loadScenarios();
  }, []);
  
  const loadScenarios = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from the API
      const mockScenarios = [
        {
          scenario_id: '1',
          name: 'Basic Social Engineering Test',
          description: 'Test defenses against basic social engineering tactics',
          exercise_type: 'social_engineering',
          difficulty: 'beginner'
        },
        {
          scenario_id: '2',
          name: 'Intermediate Meme Campaign Simulation',
          description: 'Simulate a coordinated meme-based misinformation campaign',
          exercise_type: 'meme_campaign',
          difficulty: 'intermediate'
        }
      ];
      setScenarios(mockScenarios);
    } catch (error) {
      toast.error('Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  };
  
  const initialValues = {
    name: '',
    description: '',
    exercise_type: 'social_engineering',
    difficulty: 'intermediate',
    objectives: [''],
    constraints: [''],
    success_criteria: [''],
    estimated_duration: 60,
    team_roles: ['red_team_attacker', 'blue_team_defender'],
    threat_actors_involved: [''],
    detection_methods_to_test: [''],
    mitigation_strategies: [''],
    created_by: 'Web UI User'
  };
  
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      // In a real implementation, this would POST to the API
      console.log('Submitting scenario:', values);
      toast.success('Scenario created successfully!');
      resetForm();
      loadScenarios(); // Refresh scenario list
    } catch (error) {
      toast.error('Failed to create scenario');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Container>
      <Header>
        <Title>🛡️ Scenario Builder</Title>
        <Button onClick={() => toast.info('Scenario templates coming soon')}>
          <FiPlus /> Load Template
        </Button>
      </Header>
      
      <Formik
        initialValues={initialValues}
        validationSchema={scenarioSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, isSubmitting, isValid }) => (
          <Form>
            <FormSection>
              <h2>Basic Information</h2>
              
              <FormGroup>
                <Label htmlFor="name">Scenario Name *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter a descriptive name for your scenario"
                />
                {errors.name && touched.name && (
                  <div style={{ color: '#e74c3c', marginTop: '0.25rem' }}>{errors.name}</div>
                )}
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="description">Description *</Label>
                <TextArea
                  id="description"
                  name="description"
                  placeholder="Provide a detailed description of the scenario"
                />
                {errors.description && touched.description && (
                  <div style={{ color: '#e74c3c', marginTop: '0.25rem' }}>{errors.description}</div>
                )}
              </FormGroup>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormGroup>
                  <Label htmlFor="exercise_type">Exercise Type *</Label>
                  <Select
                    id="exercise_type"
                    name="exercise_type"
                    as="select"
                  >
                    {exerciseTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                  {errors.exercise_type && touched.exercise_type && (
                    <div style={{ color: '#e74c3c', marginTop: '0.25rem' }}>{errors.exercise_type}</div>
                  )}
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="difficulty">Difficulty *</Label>
                  <Select
                    id="difficulty"
                    name="difficulty"
                    as="select"
                  >
                    {difficultyLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </Select>
                  {errors.difficulty && touched.difficulty && (
                    <div style={{ color: '#e74c3c', marginTop: '0.25rem' }}>{errors.difficulty}</div>
                  )}
                </FormGroup>
              </div>
            </FormSection>
            
            <FormSection>
              <h2>Objectives</h2>
              <FieldArray name="objectives">
                {({ push, remove }) => (
                  <div>
                    {values.objectives.map((_, index) => (
                      <FormGroup key={index}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Input
                            name={`objectives.${index}`}
                            type="text"
                            placeholder={`Objective ${index + 1}`}
                          />
                          {values.objectives.length > 1 && (
                            <IconButton type="button" onClick={() => remove(index)}>
                              <FiTrash2 />
                            </IconButton>
                          )}
                        </div>
                        {errors.objectives?.[index] && touched.objectives?.[index] && (
                          <div style={{ color: '#e74c3c', marginTop: '0.25rem' }}>
                            {errors.objectives[index]}
                          </div>
                        )}
                      </FormGroup>
                    ))}
                    <Button type="button" onClick={() => push('')}>
                      <FiPlus /> Add Objective
                    </Button>
                  </div>
                )}
              </FieldArray>
            </FormSection>
            
            <FormSection>
              <h2>Constraints</h2>
              <FieldArray name="constraints">
                {({ push, remove }) => (
                  <div>
                    {values.constraints.map((_, index) => (
                      <FormGroup key={index}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Input
                            name={`constraints.${index}`}
                            type="text"
                            placeholder={`Constraint ${index + 1}`}
                          />
                          {values.constraints.length > 1 && (
                            <IconButton type="button" onClick={() => remove(index)}>
                              <FiTrash2 />
                            </IconButton>
                          )}
                        </div>
                      </FormGroup>
                    ))}
                    <Button type="button" onClick={() => push('')}>
                      <FiPlus /> Add Constraint
                    </Button>
                  </div>
                )}
              </FieldArray>
            </FormSection>
            
            <FormSection>
              <h2>Success Criteria</h2>
              <FieldArray name="success_criteria">
                {({ push, remove }) => (
                  <div>
                    {values.success_criteria.map((_, index) => (
                      <FormGroup key={index}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Input
                            name={`success_criteria.${index}`}
                            type="text"
                            placeholder={`Success Criterion ${index + 1}`}
                          />
                          {values.success_criteria.length > 1 && (
                            <IconButton type="button" onClick={() => remove(index)}>
                              <FiTrash2 />
                            </IconButton>
                          )}
                        </div>
                      </FormGroup>
                    ))}
                    <Button type="button" onClick={() => push('')}>
                      <FiPlus /> Add Success Criterion
                    </Button>
                  </div>
                )}
              </FieldArray>
            </FormSection>
            
            <FormSection>
              <h2>Team Configuration</h2>
              
              <FormGroup>
                <Label htmlFor="estimated_duration">Estimated Duration (minutes) *</Label>
                <Input
                  id="estimated_duration"
                  name="estimated_duration"
                  type="number"
                  min="1"
                  placeholder="60"
                />
                {errors.estimated_duration && touched.estimated_duration && (
                  <div style={{ color: '#e74c3c', marginTop: '0.25rem' }}>{errors.estimated_duration}</div>
                )}
              </FormGroup>
              
              <FormGroup>
                <Label>Team Roles *</Label>
                <FieldArray name="team_roles">
                  {({ push, remove }) => (
                    <div>
                      {teamRoles.map(role => (
                        <div key={role.value} style={{ marginBottom: '0.5rem' }}>
                          <label>
                            <Field
                              type="checkbox"
                              name="team_roles"
                              value={role.value}
                            />
                            {' '}
                            {role.label}
                          </label>
                        </div>
                      ))}
                      {errors.team_roles && touched.team_roles && (
                        <div style={{ color: '#e74c3c', marginTop: '0.25rem' }}>{errors.team_roles}</div>
                      )}
                    </div>
                  )}
                </FieldArray>
              </FormGroup>
            </FormSection>
            
            <FormSection>
              <h2>Advanced Configuration</h2>
              
              <FormGroup>
                <Label>Threat Actors Involved</Label>
                <FieldArray name="threat_actors_involved">
                  {({ push, remove }) => (
                    <div>
                      {values.threat_actors_involved.map((_, index) => (
                        <FormGroup key={index}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Input
                              name={`threat_actors_involved.${index}`}
                              type="text"
                              placeholder={`Threat Actor ${index + 1}`}
                            />
                            {values.threat_actors_involved.length > 1 && (
                              <IconButton type="button" onClick={() => remove(index)}>
                                <FiTrash2 />
                              </IconButton>
                            )}
                          </div>
                        </FormGroup>
                      ))}
                      <Button type="button" onClick={() => push('')}>
                        <FiPlus /> Add Threat Actor
                      </Button>
                    </div>
                  )}
                </FieldArray>
              </FormGroup>
              
              <FormGroup>
                <Label>Detection Methods to Test</Label>
                <FieldArray name="detection_methods_to_test">
                  {({ push, remove }) => (
                    <div>
                      {values.detection_methods_to_test.map((_, index) => (
                        <FormGroup key={index}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Input
                              name={`detection_methods_to_test.${index}`}
                              type="text"
                              placeholder={`Detection Method ${index + 1}`}
                            />
                            {values.detection_methods_to_test.length > 1 && (
                              <IconButton type="button" onClick={() => remove(index)}>
                                <FiTrash2 />
                              </IconButton>
                            )}
                          </div>
                        </FormGroup>
                      ))}
                      <Button type="button" onClick={() => push('')}>
                        <FiPlus /> Add Detection Method
                      </Button>
                    </div>
                  )}
                </FieldArray>
              </FormGroup>
              
              <FormGroup>
                <Label>Mitigation Strategies</Label>
                <FieldArray name="mitigation_strategies">
                  {({ push, remove }) => (
                    <div>
                      {values.mitigation_strategies.map((_, index) => (
                        <FormGroup key={index}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Input
                              name={`mitigation_strategies.${index}`}
                              type="text"
                              placeholder={`Mitigation Strategy ${index + 1}`}
                            />
                            {values.mitigation_strategies.length > 1 && (
                              <IconButton type="button" onClick={() => remove(index)}>
                                <FiTrash2 />
                              </IconButton>
                            )}
                          </div>
                        </FormGroup>
                      ))}
                      <Button type="button" onClick={() => push('')}>
                        <FiPlus /> Add Mitigation Strategy
                      </Button>
                    </div>
                  )}
                </FieldArray>
              </FormGroup>
            </FormSection>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={isSubmitting || !isValid} primary>
                <FiSave /> {isSubmitting ? 'Saving...' : 'Save Scenario'}
              </Button>
              <Button type="button" disabled={isSubmitting || !isValid}>
                <FiPlay /> Run Exercise
              </Button>
            </div>
          </Form>
        )}
      </Formik>
      
      <FormSection>
        <h2>Existing Scenarios</h2>
        {loading ? (
          <p>Loading scenarios...</p>
        ) : scenarios.length > 0 ? (
          <ListContainer>
            {scenarios.map(scenario => (
              <ListItem key={scenario.scenario_id}>
                <div>
                  <strong>{scenario.name}</strong>
                  <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                    {scenario.description.substring(0, 100)}...
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ 
                    backgroundColor: '#3498db', 
                    color: 'white', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}>
                    {scenario.exercise_type.replace('_', ' ')}
                  </span>
                  <span style={{ 
                    backgroundColor: '#2ecc71', 
                    color: 'white', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}>
                    {scenario.difficulty}
                  </span>
                </div>
              </ListItem>
            ))}
          </ListContainer>
        ) : (
          <p>No scenarios found. Create your first scenario above!</p>
        )}
      </FormSection>
    </Container>
  );
};

export default ScenarioBuilder;