import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {theme, spacing, typography, shadows} from '../theme';
import {Card, Badge, EmptyState, Chip} from '../components/UIComponents';
import {useDebounce} from '../hooks/useDebounce';

interface SearchResult {
  id: string;
  type: 'entity' | 'case' | 'relationship';
  title: string;
  subtitle?: string;
  tags?: string[];
  score?: number;
}

type FilterType = 'all' | 'entities' | 'cases' | 'relationships';

export const SearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const debouncedQuery = useDebounce(searchQuery, 300);

  const {data: results, isLoading} = useQuery<SearchResult[]>({
    queryKey: ['search', debouncedQuery, activeFilter],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];

      // Mock search results - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return [
        {
          id: '1',
          type: 'entity',
          title: 'John Smith',
          subtitle: 'Person • Last seen: 2 days ago',
          tags: ['High Risk', 'Verified'],
          score: 0.95,
        },
        {
          id: '2',
          type: 'case',
          title: 'Operation Phoenix',
          subtitle: 'Active investigation • 15 entities',
          tags: ['Urgent', 'Intelligence'],
          score: 0.89,
        },
        {
          id: '3',
          type: 'entity',
          title: 'Acme Corporation',
          subtitle: 'Organization • 42 relationships',
          tags: ['Business', 'International'],
          score: 0.78,
        },
        {
          id: '4',
          type: 'relationship',
          title: 'Financial Transaction',
          subtitle: 'John Smith → Acme Corporation',
          tags: ['Suspicious'],
          score: 0.72,
        },
      ].filter(item => activeFilter === 'all' || item.type === activeFilter.slice(0, -1));
    },
    enabled: debouncedQuery.length >= 2,
  });

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const renderFilterChip = (filter: FilterType, label: string, icon: string) => (
    <TouchableOpacity
      key={filter}
      onPress={() => setActiveFilter(filter)}
      style={[
        styles.filterChip,
        activeFilter === filter && styles.filterChipActive,
      ]}>
      <Icon
        name={icon}
        size={16}
        color={activeFilter === filter ? theme.colors.primary : theme.colors.textSecondary}
      />
      <Text
        style={[
          styles.filterChipText,
          activeFilter === filter && styles.filterChipTextActive,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSearchResult = ({item}: {item: SearchResult}) => {
    const getIcon = () => {
      switch (item.type) {
        case 'entity':
          return 'account-circle';
        case 'case':
          return 'briefcase';
        case 'relationship':
          return 'link-variant';
        default:
          return 'file-document';
      }
    };

    return (
      <TouchableOpacity>
        <Card style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.resultIconContainer}>
              <Icon name={getIcon()} size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.resultContent}>
              <View style={styles.resultTitleRow}>
                <Text style={styles.resultTitle}>{item.title}</Text>
                {item.score && (
                  <Text style={styles.resultScore}>
                    {Math.round(item.score * 100)}%
                  </Text>
                )}
              </View>
              {item.subtitle && (
                <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
              )}
              {item.tags && item.tags.length > 0 && (
                <View style={styles.resultTags}>
                  {item.tags.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" />
                  ))}
                </View>
              )}
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const showResults = debouncedQuery.length >= 2;
  const hasResults = results && results.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Icon name="magnify" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search entities, cases, relationships..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
              <Icon name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}>
          {renderFilterChip('all', 'All', 'apps')}
          {renderFilterChip('entities', 'Entities', 'account-group')}
          {renderFilterChip('cases', 'Cases', 'briefcase')}
          {renderFilterChip('relationships', 'Links', 'link-variant')}
        </ScrollView>
      </View>

      <View style={styles.resultsContainer}>
        {!showResults && (
          <EmptyState
            icon="magnify"
            title="Start Searching"
            message="Enter at least 2 characters to search for entities, cases, and relationships"
          />
        )}

        {showResults && isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {showResults && !isLoading && !hasResults && (
          <EmptyState
            icon="file-search-outline"
            title="No Results Found"
            message={`No results found for "${searchQuery}"`}
          />
        )}

        {showResults && !isLoading && hasResults && (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {results.length} {results.length === 1 ? 'result' : 'results'}
              </Text>
              <Text style={styles.resultsQuery}>for "{searchQuery}"</Text>
            </View>
            <FlatList
              data={results}
              renderItem={renderSearchResult}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    backgroundColor: theme.colors.surface,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    ...shadows.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: typography.sizes.md,
    color: theme.colors.text,
    fontFamily: typography.fonts.regular,
  },
  clearButton: {
    padding: spacing.xs,
  },
  filtersContainer: {
    marginBottom: spacing.xs,
  },
  filtersContent: {
    paddingRight: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary + '15',
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    marginLeft: spacing.xs,
    fontSize: typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.medium,
  },
  filterChipTextActive: {
    color: theme.colors.primary,
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  resultsCount: {
    fontSize: typography.sizes.sm,
    color: theme.colors.text,
    fontFamily: typography.fonts.semibold,
    marginRight: spacing.xs,
  },
  resultsQuery: {
    fontSize: typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
  },
  resultsList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  resultCard: {
    marginBottom: spacing.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  resultContent: {
    flex: 1,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  resultTitle: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: theme.colors.text,
    fontFamily: typography.fonts.semibold,
  },
  resultScore: {
    fontSize: typography.sizes.sm,
    color: theme.colors.success,
    fontFamily: typography.fonts.medium,
    marginLeft: spacing.sm,
  },
  resultSubtitle: {
    fontSize: typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
    marginBottom: spacing.xs,
  },
  resultTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
